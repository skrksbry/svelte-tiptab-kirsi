<!-- src/routes/wc/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';

    // 웹 컴포넌트의 타입을 정의 (선택적이지만 타입 안정성을 위해 권장)
    interface KirsiEditorElement extends HTMLElement {
        setContent: (content: string) => void;
        getContent: () => string;
        setImages: (images: any[]) => void; // ImageInfo 타입을 가져올 수 없으므로 any 사용
        getImages: () => any[];
        setDarkMode: (darkModeEnabled: boolean) => void; // 다크 모드 설정 메서드 추가
        isDarkMode: () => boolean; // 다크 모드 상태 확인 메서드 추가
        useAutoDarkMode: () => void; // 자동 다크 모드 설정 메서드 추가
        setToolbarOptions: (options: Record<string, boolean>) => void; // 툴바 옵션 설정 메서드 추가
        getToolbarOptions: () => Record<string, boolean>; // 현재 툴바 옵션 확인 메서드 추가
    }

    let editorRef: KirsiEditorElement | null = null;
    let currentContent = '<p>Web Component Loaded!</p>';
    let currentImages: any[] = [];
    let isDarkMode = true; // 초기값을 다크모드로 설정

    
    // 이미지, 제목, 굵게만 활성화하고 나머지 메뉴는 비활성화하는 툴바 옵션
    const customToolbarOptions = {
        basicFormatting: true, // 기본 서식(굵게 등) 비활성화 후 개별 설정
        headings: true, // 제목 활성화
        lists: false, // 목록 비활성화
        fontOptions: true, // 폰트 관련 옵션 비활성화
        fontFamilies: [
  { name: 'Noto Sans KR', value: 'Noto Sans KR' },
  { name: 'Roboto', value: 'Roboto' },
  { name: '나눔고딕', value: 'NanumGothic' }
],
        fontFamily: true, // 글꼴 비활성화
        fontSize: false, // 글자 크기 비활성화
        fontColor: false, // 글자 색 비활성화
        inlineObjects: true, // 인라인 객체(링크, 이미지 등) 비활성화 후 개별 설정
        links: false, // 링크 비활성화
        images: true, // 이미지 활성화
        codeBlock: false, // 코드 블록 비활성화
    };
    
    // JSON 문자열로 변환하여 웹 컴포넌트에 전달
    const toolbarOptionsStr = JSON.stringify(customToolbarOptions);

    const fontFamiliesStr = JSON.stringify(customToolbarOptions.fontFamilies);
    
    // 페이지 로드 시 다크모드 적용
    function applyDarkMode(dark: boolean) {
        isDarkMode = dark;
        document.documentElement.classList.toggle('dark', dark);
        document.body.classList.toggle('dark', dark);
        
        // 에디터가 초기화되었다면 다크모드 수동 설정
        if (editorRef && typeof editorRef.setDarkMode === 'function') {
            console.log(`Setting editor dark mode to: ${dark}`);
            editorRef.setDarkMode(dark);
        }
    }
    
    // 다크모드 토글 함수
    function toggleDarkMode() {
        applyDarkMode(!isDarkMode);
    }
    
    // 자동 다크모드 설정 함수
    function useAutoDarkMode() {
        if (editorRef && typeof editorRef.useAutoDarkMode === 'function') {
            console.log('Setting editor to auto dark mode');
            editorRef.useAutoDarkMode();
            // 상태 확인을 위해 잠시 후 현재 상태 확인
            setTimeout(() => {
                if (editorRef && typeof editorRef.isDarkMode === 'function') {
                    isDarkMode = editorRef.isDarkMode();
                }
            }, 50);
        }
    }

    onMount(() => {
        // 페이지 로드 시 다크모드 적용
        applyDarkMode(isDarkMode);
        
        const editorElement = editorRef; // onMount 시점의 ref 값 사용

        if (editorElement) {
            console.log('KirsiEditor web component mounted:', editorElement);
            console.log('Shadow Root:', editorElement.shadowRoot); // Shadow DOM 확인 로그 추가

            // 초기 콘텐츠 설정 (웹 컴포넌트 로드 및 초기화 후 약간의 지연 필요)
            setTimeout(() => {
                 if ('setContent' in editorElement) {
                     editorElement.setContent(currentContent);
                     console.log('Initial content set.');
                 } else {
                     console.warn('setContent method not found on kirsi-editor element.');
                 }
            }, 100); // 지연 시간은 환경에 따라 조절

            // 웹 컴포넌트 이벤트 리스너 추가 (수정된 이벤트 이름 사용)
            const handleContentChange = (event: CustomEvent<{ content: string }>) => {
                console.log('Event: change received from web component', event.detail);
                currentContent = event.detail.content;
            };

            const handleImageListChange = (event: CustomEvent<{ images: any[] }>) => {
                console.log('Event: changeImageList received from web component', event.detail);
                currentImages = event.detail.images;
            };

            editorElement.addEventListener('change', handleContentChange as EventListener);
            editorElement.addEventListener('changeImageList', handleImageListChange as EventListener);

            // 컴포넌트 파괴 시 이벤트 리스너 제거 (Svelte가 자동으로 처리하지 않음)
            return () => {
                console.log('Removing web component event listeners.');
                editorElement.removeEventListener('change', handleContentChange as EventListener);
                editorElement.removeEventListener('changeImageList', handleImageListChange as EventListener);
            };
        } else {
             console.error('Could not get reference to kirsi-editor element.');
        }
    });

    // Svelte 페이지에서 웹 컴포넌트와 상호작용하는 함수 예시
    function showEditorContent() {
        if (editorRef && 'getContent' in editorRef) {
            alert(editorRef.getContent());
        } else {
            alert('Cannot get content from editor.');
        }
    }
     function addDemoImage() {
        if (editorRef && 'setImages' in editorRef && 'getImages' in editorRef) {
             const current = editorRef.getImages();
             const newImage = {
                 id: `demo-${Date.now()}`,
                 src: 'https://via.placeholder.com/150',
                 alt: 'Demo Image',
                 name: 'demo.png',
                 type: 'url',
                 size: 0
             };
             // setImages는 전체 목록을 교체하므로 기존 목록에 추가하여 전달
             editorRef.setImages([...current, newImage]);
             // setImages 후 이미지 목록 업데이트 반영을 위해 잠시 대기 후 가져오기
             setTimeout(() => currentImages = editorRef.getImages(), 50);
        }
     }

</script>

<svelte:head>
    <title>KirsiEditor Web Component Test</title>
    <!-- static 폴더의 웹 컴포넌트 스크립트 로드 -->
    <script src="/kirsi-editor.iife.js" defer></script>
</svelte:head>

<div class="container {isDarkMode ? 'dark-mode' : 'light-mode'}">
    <h1>KirsiEditor Web Component - {isDarkMode ? '다크 모드' : '라이트 모드'}</h1>

    <div class="theme-controls">
        <button on:click={toggleDarkMode}>
            {isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
        </button>
        <button on:click={useAutoDarkMode} class="auto-btn">
            자동 테마 감지 모드
        </button>
    </div>

    <div class="editor-container">
        <!-- 웹 컴포넌트 사용 -->
        <!-- svelte-ignore a11y-missing-attribute -->
        <kirsi-editor bind:this={editorRef} dark-mode={isDarkMode} toolbar-options={toolbarOptionsStr} font-families={fontFamiliesStr}></kirsi-editor>
    </div>

    <div class="controls">
        <button on:click={showEditorContent}>Get Editor Content</button>
        <button on:click={addDemoImage}>Add Demo Image</button>
    </div>

    <h2>Current State (from Web Component Events)</h2>
    <div>
        <h3>Images:</h3>
        <!-- <pre>{JSON.stringify(currentImages, null, 2)}</pre> -->
    </div>
    <div>
        <h3>Content:</h3>
        <div class="content-preview">
            {@html currentContent}
        </div>
    </div>
</div>

<style>
    :global(html.dark), :global(body.dark) {
        --bg-color: #121212;
        --text-color: #e0e0e0;
        --border-color: #444;
        --btn-bg: #333;
        --btn-hover-bg: #444;
        --pre-bg: #1e1e1e;
    }

    .container {
        padding: 1rem;
        min-height: 100vh;
        transition: background-color 0.3s, color 0.3s;
    }

    /* 라이트 모드 스타일 */
    .light-mode {
        background-color: #f5f5f5;
        color: #333;
    }

    /* 다크 모드 스타일 */
    .dark-mode {
        background-color: var(--bg-color, #121212);
        color: var(--text-color, #e0e0e0);
    }

    .dark-mode pre {
        background-color: var(--pre-bg, #1e1e1e);
        border-color: var(--border-color, #444);
        color: var(--text-color, #e0e0e0);
    }

    .dark-mode button {
        background-color: var(--btn-bg, #333);
        color: var(--text-color, #e0e0e0);
        border-color: var(--border-color, #444);
    }

    .dark-mode button:hover {
        background-color: var(--btn-hover-bg, #444);
    }

    .theme-controls {
        margin-bottom: 1rem;
        display: flex;
        gap: 0.5rem;
    }

    .editor-container {
        height: auto; 
        width: 100%;
        margin-bottom: 1rem;
        transition: border-color 0.3s;
        border: 1px solid var(--border-color, #ccc);
        border-radius: 4px;
    }

    .controls {
        margin: 1rem 0;
    }

    /* 웹 컴포넌트 스타일 */
    kirsi-editor {
        display: block;
        width: 100%;
        height: 100%;
        border-radius: 4px;
        overflow: hidden;
    }
    
    button {
        margin-right: 0.5rem;
        padding: 8px 12px;
        border-radius: 4px;
        border: 1px solid #ccc;
        background-color: #fff;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    button:hover {
        background-color: #f0f0f0;
    }

    .auto-btn {
        background-color: #e0f0ff;
    }

    .dark-mode .auto-btn {
        background-color: #1a365d;
    }

    pre {
        background-color: #f5f5f5;
        padding: 1rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        overflow-x: auto;
        white-space: pre-wrap;
    }

    .content-preview {
        padding: 1rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-top: 0.5rem;
        background-color: #fff;
    }

    .dark-mode .content-preview {
        background-color: #1e1e1e;
        border-color: #444;
    }

    /* 미리보기에서 빈 paragraph가 높이를 가지도록 설정 */
    .content-preview :global(p) {
        margin: 0.5em 0;
        min-height: 1.5em;
    }

    .content-preview :global(p:empty::before) {
        content: '';
        display: inline-block;
        width: 0;
    }
</style>