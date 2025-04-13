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

	const dispatch = createEventDispatcher();

	// 각 드롭다운의 표시 상태
	let showColorPicker = false;
	let showFontPicker = false;
	let showFontSizePicker = false;
	let showLinkForm = false;
	let showImageForm = false;
	let showCodeLanguagePicker = false;

	// 입력 값
	let customFontSize = '16px';
	let imageUrl = '';
	let linkUrl = '';
	let linkText = '';

	// 툴바 루트 요소 참조
	let toolbarEl: HTMLDivElement;

	// $: isCodeBlockActive = editor?.isActive('codeBlock'); // 반응형 선언 제거
	let isCodeBlockActive = false; // 일반 변수로 변경

	// 클릭 외부 감지 (Shadow DOM 고려)
	function handleClickOutside(event: Event) {
		if (!toolbarEl) return;
		const target = event.target as Node;

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

	// 모든 드롭다운 닫기 함수
	function closeAllDropdowns() {
		showColorPicker = false;
		showFontPicker = false;
		showFontSizePicker = false;
		showLinkForm = false;
		showImageForm = false;
		showCodeLanguagePicker = false;
	}

	const fontFamilies = [
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

	const codeLanguages = [
		{ name: 'Auto', value: null },
		{ name: 'Plain Text', value: 'text' },
		{ name: 'JavaScript', value: 'javascript' },
		{ name: 'TypeScript', value: 'typescript' },
		{ name: 'HTML', value: 'html' },
		{ name: 'CSS', value: 'css' },
		{ name: 'Python', value: 'python' },
		{ name: 'Java', value: 'java' },
		{ name: 'C++', value: 'cpp' },
		{ name: 'C#', value: 'csharp' },
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
		closeAllDropdowns(); // 닫기 (Color picker는 input이라 자동 닫힘이 필요 없을 수 있음)
	}

	function setFontSize(fontSize: string) {
		if (!fontSize || fontSize === 'inherit') {
            editor?.chain().focus().unsetFontSize().run();
        } else {
		    editor?.chain().focus().setFontSize(fontSize).run();
        }
		closeAllDropdowns(); // 닫기
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

	function setCodeLanguage(language: string | null) {
		if (!editor) return;
		editor.chain().focus().updateAttributes('codeBlock', { language }).run();
		showCodeLanguagePicker = false;
	}

	function toggleDropdown(dropdown: string) {
		const currentShowColorPicker = showColorPicker;
		const currentShowFontPicker = showFontPicker;
		const currentShowFontSizePicker = showFontSizePicker;
		const currentShowLinkForm = showLinkForm;
		const currentShowImageForm = showImageForm;
		const currentShowCodeLanguagePicker = showCodeLanguagePicker;

		closeAllDropdowns();

		switch (dropdown) {
			case 'colorPicker': showColorPicker = !currentShowColorPicker; break;
			case 'fontPicker': showFontPicker = !currentShowFontPicker; break;
			case 'fontSizePicker': showFontSizePicker = !currentShowFontSizePicker; break;
			case 'linkForm': showLinkForm = !currentShowLinkForm; break;
			case 'imageForm': showImageForm = !currentShowImageForm; break;
			case 'codeLanguagePicker': showCodeLanguagePicker = !currentShowCodeLanguagePicker; break;
		}
	}

	function getCurrentCodeLanguage(): string | null {
		if (!editor || !editor.isActive('codeBlock')) return null;
		return editor.getAttributes('codeBlock').language || null;
	}

	// --- isActive 함수 정의 복원 ---
	function isActive(type: string, options = {}) {
		return editor?.isActive(type, options) ?? false;
	}

	// --- 에디터 이벤트 리스너 설정 --- 
	function updateToolbarState() {
		if (!editor) return;
		isCodeBlockActive = editor.isActive('codeBlock');
		// 필요한 다른 상태들도 여기서 업데이트 가능 (예: 현재 폰트 크기 등)
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
		}
	});

</script>

<div class="toolbar" bind:this={toolbarEl}>
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
		<div class="dropdown font-picker-container">
            <button on:click|stopPropagation={() => toggleDropdown('fontPicker')} title="글꼴">
                <Type size={18} />
				<span class="current-font">{ fontFamilies.find(f => f.value === getCurrentFontFamily())?.name || '기본' }</span>
			</button>
			{#if showFontPicker}
                <div class="dropdown-content font-picker-content">
                    {#each fontFamilies as font}
                        <button on:click={() => setFontFamily(font.value)} style="font-family: {font.value}">
                            {font.name}
                        </button>
                    {/each}
                </div>
            {/if}
		</div>

		<!-- 폰트 크기 -->
        <div class="dropdown font-size-container">
            <button on:click|stopPropagation={() => toggleDropdown('fontSizePicker')} title="글자 크기" class="font-size-btn">
                <CaseSensitive size={18} />
                <span>{getCurrentFontSize() === 'inherit' ? '크기' : getCurrentFontSize()}</span>
            </button>
            {#if showFontSizePicker}
                <div class="dropdown-content font-size-content">
                    <div class="custom-font-size">
                        <input type="text" bind:value={customFontSize} placeholder="예: 16px" on:click|stopPropagation />
                        <button on:click={setCustomFontSize}>적용</button>
                    </div>
                    <div class="font-size-presets">
                        {#each fontSizes as size}
                            <button on:click={() => setFontSize(size.value)} style="font-size: {size.value}">
                                {size.name}
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>

		<!-- 폰트 색상 -->
		<div class="dropdown color-picker-container">
			<button on:click|stopPropagation={() => toggleDropdown('colorPicker')} title="글자 색">
				<Palette size={18} />
                <span class="color-indicator" style="background-color: {editor?.getAttributes('textStyle').color || '#000000'};"></span>
			</button>
			{#if showColorPicker}
                <div class="dropdown-content color-picker-content">
                    <input type="color" on:input={(e) => setColor(e.currentTarget.value)} value={editor?.getAttributes('textStyle').color || '#000000'} on:click|stopPropagation />
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

        <!-- 코드 블록 언어 선택 (코드 블록 활성화 시 보임) -->
        {#if isCodeBlockActive}
            <div class="dropdown code-language-container">
                <button on:click|stopPropagation={() => toggleDropdown('codeLanguagePicker')} title="코드 언어">
                    <FileCode size={18} />
                    <span class="current-language">{ codeLanguages.find(l => l.value === getCurrentCodeLanguage())?.name || 'Auto' }</span>
                </button>
                {#if showCodeLanguagePicker}
                    <div class="dropdown-content code-language-content">
                        {#each codeLanguages as lang}
                            <button on:click={() => setCodeLanguage(lang.value)}>
                                {lang.name}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
	</div>
</div>

<style>
	.toolbar {
		display: flex;
		padding: 8px;
		background-color: #f5f5f5;
		border-bottom: 1px solid #ccc;
		flex-wrap: wrap;
		gap: 4px;
		width: 100%;
        align-items: center; /* 버튼 높이 정렬 */
	}

	.toolbar-group {
		display: flex;
		gap: 2px;
        align-items: center; /* 버튼 높이 정렬 */
		margin-right: 8px;
		border-right: 1px solid #ddd;
		padding-right: 8px;
        height: 30px; /* 그룹 높이 고정 */
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
		color: #333;
        height: 28px; /* 버튼 높이 고정 */
        min-width: 28px; /* 최소 너비 */
	}

	button:hover {
		background-color: #e0e0e0;
	}

	button.active {
		background-color: #d0d0d0;
		border-color: #aaa;
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
		background-color: white;
		min-width: 160px;
		box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
		border-radius: 4px;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		border: 1px solid #ddd;
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

	/* 폰트 드롭다운 */
    .current-font {
        font-size: 12px;
        margin-left: 2px;
        max-width: 60px; /* 너무 길어지지 않도록 */
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

	/* 폰트 크기 드롭다운 */
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
		border: 1px solid #ccc;
		border-radius: 4px;
        font-size: 12px;
        width: 60px;
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
        border: 1px solid #ccc;
        margin-left: 4px;
    }
	.color-picker-content {
        padding: 5px;
        min-width: auto;
        width: 40px; /* 크기 고정 */
        height: 40px;
	}
	.color-picker-content input[type="color"] {
        width: 100%;
        height: 100%;
        border: none;
        padding: 0;
        background: none;
        cursor: pointer;
	}

	/* 링크/이미지 폼 드롭다운 */
	.link-form-content,
	.image-form-content {
		min-width: 250px;
	}
	.link-form-content input,
	.image-form-content input[type="text"] {
		padding: 6px 8px;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 13px;
        width: 100%;
        box-sizing: border-box;
        margin-bottom: 4px;
	}
	.link-form-content button,
	.image-form-content button {
		padding: 5px 10px;
        font-size: 13px;
        background-color: #eee;
        border: 1px solid #ccc;
        width: 100%;
        height: auto;
	}
    .image-form-content hr {
        border: none;
        border-top: 1px solid #eee;
        margin: 8px 0;
    }
    .image-form-content .file-upload-label {
        font-size: 13px;
        margin-bottom: 4px;
        color: #555;
    }
    .image-form-content input[type="file"] {
        font-size: 12px;
    }

    /* 드롭다운 컨테이너에 position: relative 추가 */
    .font-picker-container,
    .font-size-container,
    .color-picker-container,
    .link-form-container,
    .image-form-container {
        position: relative;
        display: inline-block; /* 필요 시 */
    }

    /* 코드 언어 선택 드롭다운 스타일 */
    .code-language-container {
        position: relative;
        display: inline-block;
    }
    .code-language-container > button {
        gap: 4px;
    }
    .current-language {
        font-size: 12px;
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .code-language-content {
        min-width: 120px;
        max-height: 250px;
        overflow-y: auto;
    }
     .code-language-content button {
        font-size: 13px;
        text-align: left;
        padding: 5px 8px;
     }

</style> 