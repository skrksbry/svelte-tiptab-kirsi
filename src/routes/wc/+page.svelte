<!-- src/routes/wc/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';

    // 웹 컴포넌트의 타입을 정의 (선택적이지만 타입 안정성을 위해 권장)
    interface KirsiEditorElement extends HTMLElement {
        setContent: (content: string) => void;
        getContent: () => string;
        setImages: (images: any[]) => void; // ImageInfo 타입을 가져올 수 없으므로 any 사용
        getImages: () => any[];
        // 필요에 따라 다른 메소드나 프로퍼티 타입 추가
    }

    let editorRef: KirsiEditorElement | null = null;
    let currentContent = '<p>Web Component Loaded!</p>';
    let currentImages: any[] = [];

    onMount(() => {
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

<h1>KirsiEditor Web Component</h1>


<div style="width: 100%; display: flex; justify-content: center; margin:10px;">
<div style="height: 500px; width: 80%; margin-bottom: 1rem;">
    <!-- 웹 컴포넌트 사용 -->
    <!-- svelte-ignore a11y-missing-attribute -->
    <kirsi-editor bind:this={editorRef}></kirsi-editor>
</div>
</div>

<div style="margin-top: 1rem;">
    <button on:click={showEditorContent}>Get Editor Content</button>
    <button on:click={addDemoImage}>Add Demo Image</button>
</div>

<h2>Current State (from Web Component Events)</h2>
<div>
    <h3>Images:</h3>
    <pre>{JSON.stringify(currentImages, null, 2)}</pre>
</div>
<div>
    <h3>Content:</h3>
</div>

<style>
    /* 페이지 레벨 스타일 */
    kirsi-editor {
        display: block; /* 웹 컴포넌트가 영역을 차지하도록 */
        width: 100%;
        height: 100%;
    }
     button {
         margin-right: 0.5rem;
     }
</style>