<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Editor } from '@tiptap/core';
	import {
		Bold,
		Italic,
		Underline,
		Strikethrough,
		Heading1,
		Heading2,
		Heading3,
		List,
		ListOrdered,
		Link,
		Image,
		Code,
		Palette,
		CaseSensitive,
		Type,
		FileCode,
	} from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';

	export let editor: Editor;
	export let isDarkMode: boolean = false; // 다크 모드 상태를 받아오는 prop 추가

	interface AddImageDetail {
		file?: File;
		src?: string;
		alt?: string;
	}

	const dispatch = createEventDispatcher<{
		addImage: AddImageDetail;
	}>();

	// 각 드롭다운의 표시 상태
	let showColorPicker = false;
	let showFontPicker = false;
	let showFontSizePicker = false;
	let showLinkForm = false;
	let showImageForm = false;

	// 입력 값
	let customFontSize = '16px';
	let imageUrl = '';
	let linkUrl = '';
	let linkText = '';

	// 추천 색상 배열 추가
	const recommendedColors = [
		{ name: '검정', value: '#000000' },
		{ name: '회색', value: '#777777' },
		{ name: '빨강', value: '#FF0000' },
		{ name: '파랑', value: '#0000FF' },
		{ name: '녹색', value: '#008000' },
		{ name: '노랑', value: '#FFFF00' },
		{ name: '보라', value: '#800080' },
		{ name: '주황', value: '#FFA500' },
		{ name: '하늘', value: '#00BFFF' },
		{ name: '분홍', value: '#FF69B4' },
	];

	// 툴바 루트 요소 참조
	let toolbarEl: HTMLDivElement;

	// 마우스 이벤트 플래그 추가
	let isColorPickerDragging = false;

	let isCodeBlockActive = false;

	// 선택된 텍스트의 스타일 정보를 저장할 반응형 변수들
	let selectedFontFamily = 'inherit';
	let selectedFontSize = 'inherit';
	let selectedColor = '#000000';

	// 클릭 외부 감지 (Shadow DOM 고려)
	function handleClickOutside(event: Event) {
		if (!toolbarEl) return;
		const target = event.target as Node;

		// 컬러피커 드래그 중이면 이벤트 무시
		if (isColorPickerDragging) {
			return;
		}

        // 클릭된 요소가 컬러 피커 input 자체인지 확인
        if ((target as HTMLElement).matches('.color-picker-content input[type="color"]')) {
            console.log("[Toolbar] Clicked inside color input, ignoring.");
            return; // 컬러 피커 내부 input 클릭이면 닫지 않음
        }
        
        // 클릭된 요소가 컬러 피커 드롭다운 컨텐츠 영역인지 확인
        const colorPickerContent = toolbarEl.querySelector('.color-picker-content');
        if (showColorPicker && colorPickerContent?.contains(target)) {
            console.log("[Toolbar] Clicked inside color picker content, ignoring.");
            return; // 컬러 피커 드롭다운 내부 클릭(input 제외)이면 닫지 않음
        }

		// 클릭된 요소가 툴바 내부에 속하는지 확인 (위에서 이미 확인했지만, 명확성을 위해)
		if (!toolbarEl.contains(target)) {
             console.log("[Toolbar] Clicked outside toolbar, closing dropdowns.");
			closeAllDropdowns();
			return;
		}

        // 클릭된 요소가 드롭다운 토글 버튼이거나 드롭다운 컨텐츠 내부가 아니면 닫기
        const isToggleButton = (target as HTMLElement).closest('.dropdown > button');
        const isDropdownContent = (target as HTMLElement).closest('.dropdown-content'); // 컬러피커 제외
        
        if (!isToggleButton && !isDropdownContent) {
             console.log("[Toolbar] Clicked outside dropdown toggle/content, closing dropdowns.");
             closeAllDropdowns();
        }
	}

	// 마우스 이벤트 핸들러 추가
	function handleColorPickerMouseDown() {
		isColorPickerDragging = true;
	}
	
	function handleColorPickerMouseUp() {
		isColorPickerDragging = false;
	}

	// 모든 드롭다운 닫기 함수
	function closeAllDropdowns() {
		showColorPicker = false;
		showFontPicker = false;
		showFontSizePicker = false;
		showLinkForm = false;
		showImageForm = false;
	}

	const fontFamilies = [
		{ name: 'Pretendard', value: 'Pretendard' },
		{ name: '기본', value: 'inherit' },
		{ name: '고딕', value: 'sans-serif' },
		{ name: '명조', value: 'serif' },
		{ name: '모노스페이스', value: 'monospace' },
	];

	const fontSizes = [
		{ name: '10px', value: '10px' },
		{ name: '12px', value: '12px' },
		{ name: '14px', value: '14px' },
		{ name: '16px', value: '16px' },
		{ name: '18px', value: '18px' },
		{ name: '20px', value: '20px' },
		{ name: '24px', value: '24px' },
		{ name: '28px', value: '28px' },
		{ name: '32px', value: '32px' },
		{ name: '36px', value: '36px' },
		{ name: '42px', value: '42px' },
		{ name: '48px', value: '48px' },
	];

	function toggleBold() {
		editor?.chain().focus().toggleBold().run();
	}

	function toggleItalic() {
		editor?.chain().focus().toggleItalic().run();
	}

	function toggleUnderline() {
		editor?.chain().focus().toggleUnderline().run();
	}

	function toggleStrikethrough() {
		editor?.chain().focus().toggleStrike().run();
	}

	function setHeading(level: 1 | 2 | 3) {
		editor?.chain().focus().toggleHeading({ level }).run();
	}

	function toggleBulletList() {
		editor?.chain().focus().toggleBulletList().run();
	}

	function toggleOrderedList() {
		editor?.chain().focus().toggleOrderedList().run();
	}

	function toggleCodeBlock() {
		editor?.chain().focus().toggleCodeBlock().run();
	}

	function setFontFamily(fontFamily: string) {
		if (!fontFamily || fontFamily === 'inherit') {
			editor?.chain().focus().unsetFontFamily().run();
		} else {
			editor?.chain().focus().setFontFamily(fontFamily).run();
		}
		closeAllDropdowns(); // 닫기
	}

	function setColor(color: string) {
		editor?.chain().focus().setColor(color).run();
		selectedColor = color; // 현재 선택된 색상 업데이트
	}

	function setFontSize(fontSize: string) {
		if (!fontSize || fontSize === 'inherit') {
            editor?.chain().focus().unsetFontSize().run();
        } else {
		    editor?.chain().focus().setFontSize(fontSize).run();
        }
	}

	function setCustomFontSize() {
		const size = customFontSize.replace(/[^0-9]/g, '');
		if (size) {
			const fontSizeWithUnit = `${size}px`;
			editor?.chain().focus().setFontSize(fontSizeWithUnit).run();
			customFontSize = fontSizeWithUnit;
		} else {
            editor?.chain().focus().unsetFontSize().run();
        }
		closeAllDropdowns(); // 닫기
	}

	function addImageFromUrl() {
		if (!imageUrl) return;
		dispatch('addImage', { src: imageUrl, alt: '이미지' });
		imageUrl = '';
		closeAllDropdowns(); // 닫기
	}

	function addImageFromFile(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		dispatch('addImage', { file });
		input.value = '';
		closeAllDropdowns(); // 닫기
	}

	function addLink() {
		if (!linkUrl) return;
		if (linkText) {
			editor?.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run();
		} else {
			editor?.chain().focus().setLink({ href: linkUrl }).run();
		}
		linkUrl = '';
		linkText = '';
		closeAllDropdowns(); // 닫기
	}

	function getCurrentFontSize() {
		return editor?.getAttributes('textStyle').fontSize || 'inherit';
	}

    function getCurrentFontFamily() {
		return editor?.getAttributes('textStyle').fontFamily || 'inherit';
	}

	function toggleDropdown(dropdown: string) {
		const currentShowColorPicker = showColorPicker;
		const currentShowFontPicker = showFontPicker;
		const currentShowFontSizePicker = showFontSizePicker;
		const currentShowLinkForm = showLinkForm;
		const currentShowImageForm = showImageForm;

		closeAllDropdowns();

		switch (dropdown) {
			case 'colorPicker': showColorPicker = !currentShowColorPicker; break;
			case 'fontPicker': showFontPicker = !currentShowFontPicker; break;
			case 'fontSizePicker': showFontSizePicker = !currentShowFontSizePicker; break;
			case 'linkForm': showLinkForm = !currentShowLinkForm; break;
			case 'imageForm': showImageForm = !currentShowImageForm; break;
		}
	}

	// --- isActive 함수 정의 복원 ---
	function isActive(type: string, options: Record<string, any> = {}) {
		return editor?.isActive(type, options) ?? false;
	}

	// 스타일 정보 업데이트 함수
	function updateSelectedStyles() {
		if (!editor) return;
		
		const attrs = editor.getAttributes('textStyle');
		selectedFontFamily = attrs.fontFamily || 'inherit';
		selectedFontSize = attrs.fontSize || 'inherit';
		selectedColor = attrs.color || '#000000';
	}

	// --- 에디터 이벤트 리스너 설정 --- 
	function updateToolbarState() {
		console.log("[Toolbar] Updating toolbar state...");
		if (!editor) return;
		isCodeBlockActive = editor.isActive('codeBlock');
		updateSelectedStyles(); // 스타일 정보 업데이트 추가
	}

	onMount(() => {
		if (editor) {
			editor.on('transaction', updateToolbarState);
			editor.on('selectionUpdate', updateToolbarState);
			updateToolbarState(); // 초기 상태 설정
		}
		// 외부 클릭 리스너 설정 (기존 코드 유지)
		if (toolbarEl) {
			const rootNode = toolbarEl.getRootNode();
			rootNode.addEventListener('mousedown', handleClickOutside);
			
			// 글로벌 마우스업 이벤트 추가
			document.addEventListener('mouseup', handleColorPickerMouseUp);
		}
	});

	onDestroy(() => {
		if (editor) {
			editor.off('transaction', updateToolbarState);
			editor.off('selectionUpdate', updateToolbarState);
		}
		 // 외부 클릭 리스너 제거 (기존 코드 유지)
		if (toolbarEl) {
			const rootNode = toolbarEl.getRootNode();
			rootNode.removeEventListener('mousedown', handleClickOutside);
			
			// 글로벌 마우스업 이벤트 제거
			document.removeEventListener('mouseup', handleColorPickerMouseUp);
		}
	});

</script>

<div class="toolbar {isDarkMode ? 'toolbar-dark' : 'toolbar-light'}" bind:this={toolbarEl}>
	<!-- 기본 서식 -->
	<div class="toolbar-group">
		<button class:active={isActive('bold')} on:click={toggleBold} title="굵게">
			<Bold size={18} />
		</button>
		<button class:active={isActive('italic')} on:click={toggleItalic} title="기울임">
			<Italic size={18} />
		</button>
		<button class:active={isActive('underline')} on:click={toggleUnderline} title="밑줄">
			<Underline size={18} />
		</button>
		<button class:active={isActive('strike')} on:click={toggleStrikethrough} title="취소선">
			<Strikethrough size={18} />
		</button>
	</div>

	<!-- 헤딩 -->
	<div class="toolbar-group">
		<button class:active={isActive('heading', { level: 1 })} on:click={() => setHeading(1)} title="제목 1">
			<Heading1 size={18} />
		</button>
		<button class:active={isActive('heading', { level: 2 })} on:click={() => setHeading(2)} title="제목 2">
			<Heading2 size={18} />
		</button>
		<button class:active={isActive('heading', { level: 3 })} on:click={() => setHeading(3)} title="제목 3">
			<Heading3 size={18} />
		</button>
	</div>

	<!-- 목록 -->
	<div class="toolbar-group">
		<button class:active={isActive('bulletList')} on:click={toggleBulletList} title="글머리 기호">
			<List size={18} />
		</button>
		<button class:active={isActive('orderedList')} on:click={toggleOrderedList} title="번호 매기기">
			<ListOrdered size={18} />
		</button>
	</div>

	<!-- 폰트 관련 -->
	<div class="toolbar-group">
		<!-- 폰트 종류 -->
		<div class="toolbar-group font-family-container">
			<div class="font-icon-wrapper">
				<Type size={18} />
			</div>
			<select 
				value={selectedFontFamily} 
				on:change={(e) => setFontFamily(e.currentTarget.value)}
				style="font-family: {selectedFontFamily}"
			>
				{#each fontFamilies as font}
					<option value={font.value} style="font-family: {font.value}">
						{font.name}
					</option>
				{/each}
			</select>
		</div>

		<!-- 폰트 크기 - select box로 교체 -->
        <div class="toolbar-group font-size-container">
            <div class="font-icon-wrapper">
                <CaseSensitive size={18} />
            </div>
            <select 
                value={selectedFontSize}
                on:change={(e) => setFontSize(e.currentTarget.value)}
            >
                <option value="inherit">기본 크기</option>
                {#each fontSizes as size}
                    <option value={size.value}>
                        {size.name}
                    </option>
                {/each}
            </select>
        </div>

		<!-- 폰트 색상 -->
		<div class="dropdown color-picker-container">
			<button on:click|stopPropagation={() => toggleDropdown('colorPicker')} title="글자 색">
				<Palette size={18} />
                <span class="color-indicator" style="background-color: {selectedColor};"></span>
			</button>
			{#if showColorPicker}
                <div class="dropdown-content color-picker-content">
                    <div class="color-picker-wrapper">
                        <input 
                            type="color" 
                            on:input={(e) => setColor(e.currentTarget.value)} 
                            value={selectedColor} 
                            on:mousedown|stopPropagation={handleColorPickerMouseDown}
                            on:click|stopPropagation={() => {}}
                        />
                    </div>
                    <div class="recommended-colors">
                        {#each recommendedColors as color}
                            <button 
                                class="color-preset" 
                                style="background-color: {color.value};" 
                                title={color.name}
                                on:click|stopPropagation={() => setColor(color.value)}
                            ></button>
                        {/each}
                    </div>
                </div>
            {/if}
		</div>
	</div>

	<!-- 링크, 이미지, 코드 블록 -->
	<div class="toolbar-group">
		<!-- 링크 -->
		<div class="dropdown link-form-container">
			<button class:active={isActive('link')} on:click|stopPropagation={() => toggleDropdown('linkForm')} title="링크">
				<Link size={18} />
			</button>
			{#if showLinkForm}
                <div class="dropdown-content link-form-content">
                    <input type="text" bind:value={linkUrl} placeholder="URL 입력" on:click|stopPropagation />
                    <input type="text" bind:value={linkText} placeholder="링크 텍스트 (선택)" on:click|stopPropagation />
                    <button on:click={addLink}>추가</button>
                </div>
            {/if}
		</div>

		<!-- 이미지 -->
		<div class="dropdown image-form-container">
			<button on:click|stopPropagation={() => toggleDropdown('imageForm')} title="이미지">
				<Image size={18} />
			</button>
			{#if showImageForm}
                <div class="dropdown-content image-form-content">
                    <input type="text" bind:value={imageUrl} placeholder="이미지 URL 입력" on:click|stopPropagation />
                    <button on:click={addImageFromUrl}>URL로 추가</button>
                    <hr />
                    <label for="image-file-upload" class="file-upload-label">파일에서 추가:</label>
                    <input id="image-file-upload" type="file" accept="image/*" on:change={addImageFromFile} on:click|stopPropagation />
                </div>
            {/if}
		</div>

		<!-- 코드 블록 -->
		<button class:active={isCodeBlockActive} on:click={toggleCodeBlock} title="코드 블록">
			<Code size={18} />
		</button>
	</div>
</div>

<style>
	.toolbar {
		display: flex;
		padding: 8px;
		border-bottom: 1px solid;
		flex-wrap: wrap; /* 이미 flex-wrap: wrap이 있어서 줄바꿈은 가능 */
		gap: 4px;
		width: 100%;
        align-items: center; 
        overflow: visible; /* 드롭다운 메뉴가 보이도록 유지 */
        box-sizing: border-box; /* 패딩을 너비에 포함 */
        min-height: 46px; /* 최소 높이 설정 */
	}

    /* 라이트 모드 스타일 */
    .toolbar-light {
        background-color: #f5f5f5;
        border-color: #ccc;
        color: #333;
    }

    /* 다크 모드 스타일 */
    .toolbar-dark {
        background-color: #2d2d2d;
        border-color: #444;
        color: #e0e0e0;
    }

	.toolbar-group {
		display: flex;
		gap: 2px;
        align-items: center; /* 버튼 높이 정렬 */
		margin-right: 8px;
		padding-right: 8px;
        height: 30px; /* 그룹 높이 고정 */
        /* 툴바 그룹이 작을 때 줄바꿈 되도록 설정 */
        flex-wrap: nowrap; 
        min-width: fit-content;
	}

    /* 그룹이 줄바꿈될 때 오른쪽 테두리 처리 */
    @media (max-width: 768px) {
        .toolbar-group {
            margin-bottom: 4px; /* 그룹 간 세로 여백 추가 */
        }
    }

    .toolbar-light .toolbar-group {
        border-right: 1px solid #ddd;
    }

    .toolbar-dark .toolbar-group {
        border-right: 1px solid #444;
    }

	.toolbar-group:last-child {
		border-right: none;
        margin-right: 0;
        padding-right: 0;
	}

	button {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: 1px solid transparent;
		border-radius: 4px;
		padding: 4px 6px; /* 패딩 조정 */
		cursor: pointer;
        height: 28px; /* 버튼 높이 고정 */
        min-width: 28px; /* 최소 너비 */
	}

    /* 라이트 모드 버튼 스타일 */
    .toolbar-light button {
        color: #333;
    }

    .toolbar-light button:hover {
        background-color: #e0e0e0;
    }

    .toolbar-light button.active {
        background-color: #d0d0d0;
        border-color: #aaa;
    }

    /* 다크 모드 버튼 스타일 */
    .toolbar-dark button {
        color: #e0e0e0;
    }

    .toolbar-dark button:hover {
        background-color: #444;
    }

    .toolbar-dark button.active {
        background-color: #555;
        border-color: #777;
    }

	.dropdown {
		position: relative;
		display: inline-block;
	}

	.dropdown-content {
		position: absolute;
		top: calc(100% + 4px); /* 툴바 아래에 위치 */
		left: 0;
		z-index: 1000; /* 다른 요소 위에 표시 */
		min-width: 160px;
		border-radius: 4px;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
        overflow: visible; /* 모달이 잘리지 않도록 수정 */
        max-height: none; /* 높이 제한 해제 */
        max-width: none; /* 너비 제한 해제 */
	}

    /* 화면 오른쪽 끝에 있는 드롭다운 메뉴가 화면을 벗어나지 않도록 */
    @media (max-width: 768px) {
        .dropdown-content {
            right: 0; /* 오른쪽 정렬도 적용 */
            left: auto; /* 왼쪽 정렬 제거 */
        }
        
        /* 중앙에 있는 드롭다운은 왼쪽 정렬 유지 */
        .link-form-container .dropdown-content,
        .font-family-container .dropdown-content,
        .font-size-container .dropdown-content {
            left: 0;
            right: auto;
        }
    }

    /* 드롭다운 라이트/다크 모드 스타일 */
    .toolbar-light .dropdown-content {
        background-color: white;
        box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
        border: 1px solid #ddd;
    }

    .toolbar-dark .dropdown-content {
        background-color: #333;
        box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.4);
        border: 1px solid #555;
    }

    .dropdown button {
        width: 100%;
        justify-content: flex-start; /* 버튼 내용 왼쪽 정렬 */
        height: auto; /* 내부 컨텐츠 높이에 맞춤 */
        min-width: auto;
    }

    .dropdown > button {
        height: 28px; /* 드롭다운 토글 버튼 높이 고정 */
        min-width: 28px;
        display: flex;
        align-items: center;
        gap: 4px;
    }

	/* 폰트 선택 wrapper 스타일 추가 */
    .font-family-container {
		display: flex;
		align-items: center;
		gap: 4px;
        flex-shrink: 0; /* 폰트 선택 영역이 줄어들지 않도록 */
	}
    
    .font-size-container {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0; /* 폰트 크기 선택 영역이 줄어들지 않도록 */
    }

	/* 폰트 선택 select 스타일 */
	select {
		height: 28px;
		padding: 0 8px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 13px;
		min-width: 120px;
        max-width: 150px; /* 최대 너비 제한 */
        width: auto; /* 내용에 맞게 너비 조정 */
	}

    /* 작은 화면에서 select 요소 너비 줄임 */
    @media (max-width: 480px) {
        select {
            min-width: 90px;
            font-size: 12px;
            padding: 0 4px;
        }
    }

    /* 옵션 스타일링 */
    .toolbar-light select option {
        background-color: white;
        color: #333;
    }

    .toolbar-dark select option {
        background-color: #333;
        color: #e0e0e0;
    }

	select option {
		padding: 8px;
		font-size: 13px;
	}

	/* 폰트 크기 드롭다운 - 필요한 스타일은 남김 */
    .font-size-btn span {
        font-size: 12px;
        min-width: 30px; /* 최소 너비 확보 */
        text-align: center;
    }
	.font-size-content {
		min-width: 180px;
	}
	.custom-font-size {
		display: flex;
		gap: 4px;
		margin-bottom: 8px;
        align-items: center;
	}
	.custom-font-size input {
		flex: 1;
		padding: 4px 8px;
		border-radius: 4px;
        font-size: 12px;
        width: 60px;
	}

    /* 라이트/다크 모드 input 스타일 */
    .toolbar-light .custom-font-size input {
        border: 1px solid #ccc;
        background-color: white;
        color: #333;
    }

    .toolbar-dark .custom-font-size input {
        border: 1px solid #555;
        background-color: #444;
        color: #e0e0e0;
    }

    .custom-font-size button {
        white-space: nowrap;
        padding: 4px 8px;
        font-size: 12px;
        width: auto;
        height: auto;
    }
	.font-size-presets {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
		max-height: 200px; /* 스크롤 높이 제한 */
		overflow-y: auto;
	}
	.font-size-presets button {
        font-size: 12px; /* 프리셋 버튼 폰트 크기 */
        padding: 4px;
        text-align: center;
        width: 100%;
        height: auto;
	}

	/* 색상 선택 드롭다운 */
    .color-indicator {
        display: inline-block;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        margin-left: 4px;
    }

    .toolbar-light .color-indicator {
        border: 1px solid #ccc;
    }

    .toolbar-dark .color-indicator {
        border: 1px solid #777;
    }

	.color-picker-content {
        padding: 10px;
        min-width: 180px;
        width: auto;
    }
    
    .color-picker-wrapper {
        margin-bottom: 10px;
    }
    
	.color-picker-wrapper input[type="color"] {
        width: 100%;
        height: 40px;
        border: none;
        padding: 0;
        background: none;
        cursor: pointer;
        border-radius: 4px;
	}
	
	.recommended-colors {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 5px;
    }
    
    .color-preset {
        width: 25px !important;
        height: 25px !important;
        border-radius: 4px;
        cursor: pointer;
        padding: 0;
        min-width: 0;
    }
    
    .toolbar-light .color-preset {
        border: 1px solid #ccc;
    }
    
    .toolbar-dark .color-preset {
        border: 1px solid #555;
    }
    
    .color-preset:hover {
        transform: scale(1.1);
    }

    /* 작은 화면에서 색상 선택 드롭다운 반응형 처리 */
    @media (max-width: 480px) {
        .color-picker-content {
            min-width: 150px;
        }
        
        .recommended-colors {
            grid-template-columns: repeat(4, 1fr);
        }
    }

	/* 링크/이미지 폼 드롭다운 */
	.link-form-content,
	.image-form-content {
		min-width: 250px;
        width: auto; /* 내용에 맞게 자동 너비 설정 */
        box-sizing: border-box; /* 패딩을 너비에 포함 */
	}
	.link-form-content input,
	.image-form-content input[type="text"] {
		padding: 6px 8px;
		border-radius: 4px;
		font-size: 13px;
        width: 100%;
        box-sizing: border-box;
        margin-bottom: 4px;
	}

    /* 라이트/다크 모드 input 스타일 */
    .toolbar-light .link-form-content input,
    .toolbar-light .image-form-content input[type="text"] {
        border: 1px solid #ccc;
        background-color: white;
        color: #333;
    }

    .toolbar-dark .link-form-content input,
    .toolbar-dark .image-form-content input[type="text"] {
        border: 1px solid #555;
        background-color: #444;
        color: #e0e0e0;
    }

	.link-form-content button,
	.image-form-content button {
		padding: 5px 10px;
        font-size: 13px;
        width: 100%;
        height: auto;
	}

    /* 라이트/다크 모드 버튼 스타일 */
    .toolbar-light .link-form-content button,
    .toolbar-light .image-form-content button {
        background-color: #eee;
        border: 1px solid #ccc;
        color: #333;
    }

    .toolbar-dark .link-form-content button,
    .toolbar-dark .image-form-content button {
        background-color: #444;
        border: 1px solid #555;
        color: #e0e0e0;
    }

    .toolbar-light .link-form-content button:hover,
    .toolbar-light .image-form-content button:hover {
        background-color: #ddd;
    }

    .toolbar-dark .link-form-content button:hover,
    .toolbar-dark .image-form-content button:hover {
        background-color: #555;
    }

    .image-form-content hr {
        border: none;
        margin: 8px 0;
    }

    .toolbar-light .image-form-content hr {
        border-top: 1px solid #eee;
    }

    .toolbar-dark .image-form-content hr {
        border-top: 1px solid #555;
    }

    .image-form-content {
        padding: 12px; /* 패딩 증가 */
        height: auto; /* 내용에 맞게 높이 조정 */
    }

    .file-upload-label {
        display: block; /* 레이블을 블록 요소로 만들어 더 나은 간격 제공 */
        margin-bottom: 6px; /* 레이블 아래 여백 추가 */
    }

    .image-form-content .file-upload-label {
        font-size: 13px;
        margin-bottom: 4px;
    }

    .toolbar-light .image-form-content .file-upload-label {
        color: #555;
    }

    .toolbar-dark .image-form-content .file-upload-label {
        color: #ccc;
    }

    .image-form-content input[type="file"] {
        font-size: 12px;
        width: 100%; /* 파일 입력의 너비 100%로 설정 */
        box-sizing: border-box;
        padding: 4px 0; /* 상하 패딩 추가 */
        height: auto; /* 높이 자동 조정 */
        min-height: 24px; /* 최소 높이 설정 */
    }

    .toolbar-light .image-form-content input[type="file"] {
        color: #333;
    }

    .toolbar-dark .image-form-content input[type="file"] {
        color: #e0e0e0;
    }

    /* 드롭다운 컨테이너에 position: relative 추가 */
    .color-picker-container,
    .link-form-container,
    .image-form-container {
        position: relative;
        display: inline-block; 
    }

    /* 작은 화면에서 폰트, 링크, 이미지 드롭다운 반응형 처리 */
    @media (max-width: 480px) {
        .link-form-content,
        .image-form-content {
            min-width: 200px;
            width: 100%;
            max-width: 280px;
        }
    }
</style>