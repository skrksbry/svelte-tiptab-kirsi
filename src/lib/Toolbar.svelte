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
		ChevronDown,
	} from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';

	export let editor: Editor;
	export let isDarkMode: boolean = false; // 다크 모드 상태를 받아오는 prop 추가
	export let toolbarOptions: ToolbarOptions = {}; // 툴바 옵션 객체 추가
	export let fontFamilies: Array<{ name: string; value: string }> = []; // 폰트 패밀리 목록

	// 툴바 옵션 인터페이스 정의
	interface ToolbarOptions {
		basicFormatting?: boolean;
		headings?: boolean;
		lists?: boolean;
		fontOptions?: boolean;
		fontFamily?: boolean;
		fontSize?: boolean;
		fontColor?: boolean;
		inlineObjects?: boolean;
		links?: boolean;
		images?: boolean;
		codeBlock?: boolean;
	}
	
	// 툴바 옵션 기본값 설정 (모두 활성화)
	const defaultOptions: ToolbarOptions = {
		basicFormatting: true, // 굵게, 기울임, 밑줄, 취소선
		headings: true, // 제목 1, 2, 3
		lists: true, // 글머리 기호, 번호 매기기
		fontOptions: true, // 폰트 관련 모든 옵션
		fontFamily: true, // 글꼴
		fontSize: true, // 글자 크기
		fontColor: true, // 글자 색
		inlineObjects: true, // 링크, 이미지, 코드 블록 등
		links: true, // 링크
		images: true, // 이미지
		codeBlock: true, // 코드 블록
	};
	
	// 툴바 옵션 병합 (기본값 + 사용자 정의 옵션)
	const mergedOptions: ToolbarOptions = { ...defaultOptions, ...toolbarOptions };

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

	// 추천 색상 배열 추가 (첫 번째는 기본색)
	const recommendedColors = [
		{ name: '기본색', value: null }, // 색상 지정 없음
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
        const isToggleButton = (target as HTMLElement).closest('.dropdown > button') || 
                               (target as HTMLElement).closest('.custom-select-button');
        const isDropdownContent = (target as HTMLElement).closest('.dropdown-content') || 
                                 (target as HTMLElement).closest('.custom-select-menu');
        
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

	// 기본 폰트 패밀리 목록 (외부에서 전달되지 않은 경우 사용)
	const defaultFontFamilies = [
		{ name: 'Pretendard', value: 'Pretendard' },
		{ name: '기본', value: 'inherit' },
		{ name: '고딕', value: 'sans-serif' },
		{ name: '명조', value: 'serif' },
		{ name: '모노스페이스', value: 'monospace' },
	];

	// 실제 사용할 폰트 패밀리 (외부에서 전달된 것 또는 기본값)
	$: activeFontFamilies = fontFamilies && fontFamilies.length > 0 ? fontFamilies : defaultFontFamilies;

	const fontSizes = [
		{ name: '기본 크기', value: 'inherit' },
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

	function setColor(color: string | null) {
		if (color === null) {
			// 기본색 선택 시 색상 제거
			editor?.chain().focus().unsetColor().run();
			selectedColor = '#000000'; // 표시용 기본색
		} else {
			editor?.chain().focus().setColor(color).run();
			selectedColor = color; // 현재 선택된 색상 업데이트
		}
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

	// 커스텀 셀렉트 박스 핸들러 함수
	function handleCustomSelect(event: MouseEvent, type: 'fontFamily' | 'fontSize') {
		event.preventDefault();
		event.stopPropagation();
		
		// 버튼 요소 가져오기
		const button = event.currentTarget as HTMLElement;
		
		// 이미 열려있는 메뉴 확인 - 같은 버튼 클릭 시 닫고 종료
		const existingMenu = document.querySelector(`.custom-select-menu[data-type="${type}"]`);
		if (existingMenu) {
			existingMenu.remove();
			return;
		}
		
		// 다른 타입의 메뉴가 열려있으면 모두 닫기
		const existingMenus = document.querySelectorAll('.custom-select-menu');
		existingMenus.forEach(menu => menu.remove());
		
		// 메뉴 생성
		const menu = document.createElement('div');
		menu.className = `custom-select-menu ${isDarkMode ? 'dark' : 'light'}`;
		menu.dataset.type = type;
		
		// 메뉴 위치 계산해서 설정
		const buttonRect = button.getBoundingClientRect();
		menu.style.position = 'fixed';
		menu.style.top = `${buttonRect.bottom}px`;
		menu.style.left = `${buttonRect.left}px`;
		menu.style.zIndex = '1000';
		menu.style.borderRadius = '4px';
		menu.style.overflow = 'hidden';
		menu.style.minWidth = '160px';
		menu.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
		menu.style.fontSize = '12px';
		
		if (isDarkMode) {
			menu.style.backgroundColor = '#333';
			menu.style.border = '1px solid #555';
			menu.style.color = '#e0e0e0';
		} else {
			menu.style.backgroundColor = 'white';
			menu.style.border = '1px solid #ddd';
			menu.style.color = '#333';
		}
		
		// 옵션 목록 생성
		const options = type === 'fontFamily' ? activeFontFamilies : fontSizes;
		
		options.forEach(option => {
			const optionEl = document.createElement('div');
			optionEl.className = 'custom-select-option';
			
			// 폰트 패밀리 옵션은 해당 폰트로 스타일 적용
			if (type === 'fontFamily') {
				optionEl.style.fontFamily = option.value;
			}
			
			optionEl.textContent = option.name;
			optionEl.style.padding = '7px 10px';
			optionEl.style.cursor = 'pointer';
			optionEl.style.fontSize = '12px';
			optionEl.style.overflow = 'hidden';
			optionEl.style.textOverflow = 'ellipsis';
			optionEl.style.whiteSpace = 'nowrap';
			
			// 현재 선택된 옵션 표시
			const currentValue = type === 'fontFamily' ? selectedFontFamily : selectedFontSize;
			if (option.value === currentValue) {
				optionEl.classList.add('selected');
				optionEl.style.fontWeight = 'bold';
				if (isDarkMode) {
					optionEl.style.backgroundColor = '#444';
				} else {
					optionEl.style.backgroundColor = '#f0f0f0';
				}
			}
			
			// 호버 효과 스타일 추가
			optionEl.addEventListener('mouseover', () => {
				if (isDarkMode) {
					optionEl.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
				} else {
					optionEl.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
				}
			});
			
			optionEl.addEventListener('mouseout', () => {
				// 선택된 항목이 아닐 경우에만 배경색 초기화
				if (!optionEl.classList.contains('selected')) {
					optionEl.style.backgroundColor = '';
				} else {
					if (isDarkMode) {
						optionEl.style.backgroundColor = '#444';
					} else {
						optionEl.style.backgroundColor = '#f0f0f0';
					}
				}
			});
			
			// 옵션 클릭 이벤트
			optionEl.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				
				if (type === 'fontFamily') {
					setFontFamily(option.value);
				} else {
					setFontSize(option.value);
				}
				
				menu.remove();
			});
			
			menu.appendChild(optionEl);
		});
		
		// 사용자 정의 폰트 크기 입력 필드 (fontSize 메뉴에만 추가)
		if (type === 'fontSize') {
			const customSizeContainer = document.createElement('div');
			customSizeContainer.className = 'custom-size-container';
			customSizeContainer.style.display = 'flex';
			customSizeContainer.style.gap = '4px';
			customSizeContainer.style.padding = '6px 10px';
			customSizeContainer.style.borderTop = isDarkMode ? '1px solid #555' : '1px solid #eee';
			customSizeContainer.style.marginTop = '4px';
			
			const customSizeInput = document.createElement('input');
			customSizeInput.type = 'text';
			customSizeInput.value = customFontSize;
			customSizeInput.placeholder = 'Custom size';
			customSizeInput.style.flex = '1';
			customSizeInput.style.padding = '4px 8px';
			customSizeInput.style.borderRadius = '4px';
			customSizeInput.style.fontSize = '12px';
			
			if (isDarkMode) {
				customSizeInput.style.border = '1px solid #666';
				customSizeInput.style.backgroundColor = '#444';
				customSizeInput.style.color = '#e0e0e0';
			} else {
				customSizeInput.style.border = '1px solid #ccc';
				customSizeInput.style.backgroundColor = 'white';
				customSizeInput.style.color = '#333';
			}
			
			customSizeInput.addEventListener('input', (e) => {
				customFontSize = (e.target as HTMLInputElement).value;
			});
			
			const customSizeButton = document.createElement('button');
			customSizeButton.textContent = '적용';
			customSizeButton.style.padding = '3px 6px';
			customSizeButton.style.borderRadius = '4px';
			customSizeButton.style.fontSize = '12px';
			customSizeButton.style.whiteSpace = 'nowrap';
			
			if (isDarkMode) {
				customSizeButton.style.backgroundColor = '#555';
				customSizeButton.style.border = '1px solid #666';
				customSizeButton.style.color = '#e0e0e0';
			} else {
				customSizeButton.style.backgroundColor = '#eee';
				customSizeButton.style.border = '1px solid #ccc';
				customSizeButton.style.color = '#333';
			}
			
			// 호버 효과 스타일 추가
			customSizeButton.addEventListener('mouseover', () => {
				if (isDarkMode) {
					customSizeButton.style.backgroundColor = '#666';
				} else {
					customSizeButton.style.backgroundColor = '#ddd';
				}
			});
			
			customSizeButton.addEventListener('mouseout', () => {
				if (isDarkMode) {
					customSizeButton.style.backgroundColor = '#555';
				} else {
					customSizeButton.style.backgroundColor = '#eee';
				}
			});
			
			customSizeButton.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				setCustomFontSize();
				menu.remove();
			});
			
			customSizeContainer.appendChild(customSizeInput);
			customSizeContainer.appendChild(customSizeButton);
			menu.appendChild(customSizeContainer);
		}
		
		// 메뉴를 body에 추가
		document.body.appendChild(menu);
		
		// 문서 클릭시 메뉴 닫기
		const closeMenu = (e: MouseEvent) => {
			const clickTarget = e.target as HTMLElement;
			if (!menu.contains(clickTarget) && clickTarget !== button && !button.contains(clickTarget)) {
				menu.remove();
				document.removeEventListener('click', closeMenu);
			}
		};
		
		// 이벤트 등록 (setTimeout으로 현재 클릭 이벤트와 충돌 방지)
		setTimeout(() => {
			document.addEventListener('click', closeMenu);
		}, 0);
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
		
		// 남아있는 커스텀 셀렉트 메뉴 정리
		document.querySelectorAll('.custom-select-menu').forEach(menu => menu.remove());
	});

</script>

<div class="toolbar {isDarkMode ? 'toolbar-dark' : 'toolbar-light'}" bind:this={toolbarEl}>
	<!-- 기본 서식 그룹 - 옵션에 따라 표시 여부 결정 -->
	{#if mergedOptions.basicFormatting}
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
	{/if}

	<!-- 헤딩 그룹 - 옵션에 따라 표시 여부 결정 -->
	{#if mergedOptions.headings}
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
	{/if}

	<!-- 목록 그룹 - 옵션에 따라 표시 여부 결정 -->
	{#if mergedOptions.lists}
	<div class="toolbar-group">
		<button class:active={isActive('bulletList')} on:click={toggleBulletList} title="글머리 기호">
			<List size={18} />
		</button>
		<button class:active={isActive('orderedList')} on:click={toggleOrderedList} title="번호 매기기">
			<ListOrdered size={18} />
		</button>
	</div>
	{/if}

	<!-- 폰트 관련 그룹 - 옵션에 따라 표시 여부 결정 -->
	{#if mergedOptions.fontOptions && (mergedOptions.fontFamily || mergedOptions.fontSize || mergedOptions.fontColor)}
	<div class="toolbar-group">
		<!-- 폰트 종류 - 커스텀 셀렉트로 변경 -->
		{#if mergedOptions.fontFamily}
		<div class="custom-select font-family-container">
			<button 
				class="custom-select-button"
				on:click={(e) => handleCustomSelect(e, 'fontFamily')}
				title="글꼴"
			>
				<Type size={18} />
				<span class="custom-select-value" style="font-family: {selectedFontFamily}">
					{activeFontFamilies.find(f => f.value === selectedFontFamily)?.name || '기본'}
				</span>
				<ChevronDown size={14} />
			</button>
		</div>
		{/if}

		<!-- 폰트 크기 - 커스텀 셀렉트로 변경 -->
		{#if mergedOptions.fontSize}
		<div class="custom-select font-size-container">
			<button 
				class="custom-select-button"
				on:click={(e) => handleCustomSelect(e, 'fontSize')}
				title="글자 크기"
			>
				<CaseSensitive size={18} />
				<span class="custom-select-value">
					{selectedFontSize === 'inherit' ? '기본 크기' : selectedFontSize}
				</span>
				<ChevronDown size={14} />
			</button>
		</div>
		{/if}

		<!-- 폰트 색상 -->
		{#if mergedOptions.fontColor}
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
                                class:default-color={color.value === null}
                                style="background-color: {color.value || 'transparent'};" 
                                title={color.name}
                                on:click|stopPropagation={() => setColor(color.value)}
                            >
                                {#if color.value === null}
                                    <span class="default-color-icon">×</span>
                                {/if}
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}
		</div>
		{/if}
	</div>
	{/if}

	<!-- 링크, 이미지, 코드 블록 그룹 - 옵션에 따라 표시 여부 결정 -->
	{#if mergedOptions.inlineObjects && (mergedOptions.links || mergedOptions.images || mergedOptions.codeBlock)}
	<div class="toolbar-group">
		<!-- 링크 -->
		{#if mergedOptions.links}
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
		{/if}

		<!-- 이미지 -->
		{#if mergedOptions.images}
		<label class="file-input-button" title="이미지 첨부">
			<Image size={18} />
			<input type="file" accept="image/*" on:change={addImageFromFile} />
		</label>
		{/if}

		<!-- 코드 블록 -->
		{#if mergedOptions.codeBlock}
		<button class:active={isCodeBlockActive} on:click={toggleCodeBlock} title="코드 블록">
			<Code size={18} />
		</button>
		{/if}
	</div>
	{/if}
</div>

<style>
	.toolbar {
		display: flex;
		padding: 8px;
		border-bottom: 1px solid;
		flex-wrap: wrap; 
		gap: 4px;
		width: 100%;
        align-items: center; 
        overflow: visible; 
        box-sizing: border-box; 
        min-height: 46px; 
	}

    
    .toolbar-light {
        background-color: #f5f5f5;
        border-color: #ccc;
        color: #333;
    }

    
    .toolbar-dark {
        background-color: #2d2d2d;
        border-color: #444;
        color: #e0e0e0;
    }

	.toolbar-group {
		display: flex;
		gap: 2px;
        align-items: center; 
		margin-right: 8px;
		padding-right: 8px;
        height: 30px; 
        
        flex-wrap: nowrap; 
        min-width: fit-content;
	}

    
    @media (max-width: 768px) {
        .toolbar-group {
            margin-bottom: 4px; 
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
		padding: 4px 6px; 
		cursor: pointer;
        height: 28px; 
        min-width: 28px; 
	}

    
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
		top: calc(100% + 4px); 
		left: 0;
		z-index: 1000; 
		min-width: 160px;
		border-radius: 4px;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
        overflow: visible; 
        max-height: none; 
        max-width: none; 
	}

    
    @media (max-width: 768px) {
        .dropdown-content {
            right: 0; 
            left: auto; 
        }
        
        
        .link-form-container .dropdown-content,
        .font-family-container .dropdown-content,
        .font-size-container .dropdown-content {
            left: 0;
            right: auto;
        }
    }

    
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
        justify-content: flex-start; 
        height: auto; 
        min-width: auto;
    }

    .dropdown > button {
        height: 28px; 
        min-width: 28px;
        display: flex;
        align-items: center;
        gap: 4px;
    }

	
    .custom-select {
        position: relative;
        display: inline-block;
    }
    
    .custom-select-button {
        display: flex;
        align-items: center;
        gap: 6px;
        height: 28px;
        padding: 4px 6px;
        border-radius: 4px;
        cursor: pointer;
        user-select: none;
        white-space: nowrap;
        border: none;
        background: transparent;
        transition: background-color 0.2s;
    }
    
    .toolbar-light .custom-select-button:hover {
        background-color: rgba(0, 0, 0, 0.05);
    }
    
    .toolbar-dark .custom-select-button:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
    
    .custom-select-value {
        font-size: 13px;
        min-width: 60px;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: left;
    }
    
    
    @media (max-width: 480px) {
        .custom-select-value {
            min-width: 40px;
            max-width: 90px;
            font-size: 12px;
        }
        
        .custom-select-button {
            padding: 4px 6px;
        }
    }

	
    .font-family-container, .font-size-container {
		display: flex;
		align-items: center;
		gap: 4px;
        flex-shrink: 0; 
	}

	
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

    
    .color-preset.default-color {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .toolbar-light .color-preset.default-color {
        background: linear-gradient(135deg, transparent 40%, #ccc 40%, #ccc 60%, transparent 60%) !important;
        border: 1px solid #999;
    }

    .toolbar-dark .color-preset.default-color {
        background: linear-gradient(135deg, transparent 40%, #666 40%, #666 60%, transparent 60%) !important;
        border: 1px solid #777;
    }

    .default-color-icon {
        font-size: 18px;
        font-weight: bold;
        line-height: 1;
    }

    .toolbar-light .default-color-icon {
        color: #333;
    }

    .toolbar-dark .default-color-icon {
        color: #e0e0e0;
    }

    
    @media (max-width: 480px) {
        .color-picker-content {
            min-width: 150px;
        }
        
        .recommended-colors {
            grid-template-columns: repeat(4, 1fr);
        }
    }

	
	.link-form-content,
	.image-form-content {
		min-width: 250px;
        width: auto; 
        box-sizing: border-box; 
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
        padding: 12px; 
        height: auto; 
    }

    .file-upload-label {
        display: block; 
        margin-bottom: 6px; 
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
        width: 100%; 
        box-sizing: border-box;
        padding: 4px 0; 
        height: auto; 
        min-height: 24px; 
    }

    .toolbar-light .image-form-content input[type="file"] {
        color: #333;
    }

    .toolbar-dark .image-form-content input[type="file"] {
        color: #e0e0e0;
    }

    
    .color-picker-container,
    .link-form-container,
    .image-form-container {
        position: relative;
        display: inline-block; 
    }

    
    @media (max-width: 480px) {
        .link-form-content,
        .image-form-content {
            min-width: 200px;
            width: 100%;
            max-width: 280px;
        }
    }

    
    .file-input-button {
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        border: 1px solid transparent;
        border-radius: 4px;
        padding: 4px 6px;
        height: 28px;
        min-width: 28px;
    }

    .file-input-button input[type="file"] {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
    }

    .toolbar-light .file-input-button {
        color: #333;
    }

    .toolbar-light .file-input-button:hover {
        background-color: #e0e0e0;
    }

    .toolbar-light .file-input-button.active {
        background-color: #d0d0d0;
        border-color: #aaa;
    }

    .toolbar-dark .file-input-button {
        color: #e0e0e0;
    }

    .toolbar-dark .file-input-button:hover {
        background-color: #444;
    }

    .toolbar-dark .file-input-button.active {
        background-color: #555;
        border-color: #777;
    }
</style>