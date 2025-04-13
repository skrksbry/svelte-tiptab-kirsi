<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let editorElement: HTMLElement | null = null;

  onMount(async () => {
    if (browser) {
      await import('$lib/index.js');

      editorElement = document.querySelector('kirsi-editor');

      if (editorElement) {
        const initialContent = '<p>웹 컴포넌트 에디터 시작!</p>';
        const initialImages: any[] = [];
        editorElement.setAttribute('content', initialContent);
        editorElement.setAttribute('images', JSON.stringify(initialImages));

        editorElement.addEventListener('onUpdateImage', (event) => {
          const customEvent = event as CustomEvent;
          const updatedImages = customEvent.detail.images;
          console.log('[Page] 이미지 업데이트됨:', updatedImages);
        });

        editorElement.addEventListener('updateContent', (event) => {
          const customEvent = event as CustomEvent;
        });
      }
    }
  });
</script>

<div class="container">
  <h1>KirsiEditor 웹 컴포넌트 예제</h1>
  
  <div class="editor-wrapper">
    {#if browser}
      <kirsi-editor id="my-editor">
      </kirsi-editor>
    {:else}
      <div class="loading-editor">에디터 로딩 중...</div>
    {/if}
  </div>
  
  <div class="info-section">
    <h2>웹 컴포넌트 정보</h2>
    <p>이 페이지는 <code>&lt;kirsi-editor&gt;</code> 웹 컴포넌트를 사용합니다.</p>
    
    <h3>주요 속성:</h3>
    <ul>
      <li><code>content</code>: 에디터의 초기 HTML 내용 (문자열)</li>
      <li><code>images</code>: 초기 이미지 목록 (JSON 문자열 배열)</li>
    </ul>

    <h3>주요 이벤트:</h3>
    <ul>
      <li><code>onUpdateImage</code>: 이미지 목록이 변경될 때 발생 (<code>event.detail.images</code>로 접근)</li>
      <li><code>updateContent</code>: 에디터 내용이 변경될 때 발생 (<code>event.detail.content</code>로 접근)</li>
    </ul>
    
    <h3>주요 메서드 (JavaScript로 호출):</h3>
    <ul>
      <li><code>getContent()</code>: 현재 에디터 HTML 내용을 반환</li>
      <li><code>setContent(htmlString)</code>: 에디터 내용을 설정</li>
      <li><code>getImages()</code>: 현재 이미지 목록 배열을 반환</li>
      <li><code>setImages(imageArray)</code>: 이미지 목록을 설정</li>
    </ul>
    <pre>const editor = document.querySelector('kirsi-editor');
// 내용 가져오기
const currentContent = editor.getContent();
// 이미지 목록 업데이트 리스너
editor.addEventListener('onUpdateImage', (e) => console.log(e.detail.images));</pre>

    <h3 style="margin-top: 2em;">React에서 사용 예제:</h3>
    <p>React 컴포넌트에서 <code>&lt;kirsi-editor&gt;</code> 웹 컴포넌트를 사용하는 방법입니다.</p>
    <pre>{`import React, { useEffect, useRef, useState, useCallback } from 'react';
// 웹 컴포넌트 정의를 로드합니다 (빌드 시스템에 맞게 경로 조정)
import 'path/to/your/kirsi-editor/library/index.js'; 

// 이미지 정보 타입을 정의합니다 (TypeScript 사용 시)
interface ImageInfo { 
  id: string;
  src: string;
  alt: string;
  name: string;
  type: string;
  size: number;
  file?: File;
}

// 웹 컴포넌트 요소의 타입을 확장합니다 (TypeScript 사용 시)
interface KirsiEditorElement extends HTMLElement {
  setContent?: (content: string) => void;
  getContent?: () => string;
  setImages?: (images: ImageInfo[]) => void;
  getImages?: () => ImageInfo[];
}

function MyReactEditorComponent() {
  const editorRef = useRef<KirsiEditorElement>(null);
  const [editorContent, setEditorContent] = useState('<p>React 초기 내용</p>');
  const [editorImages, setEditorImages] = useState<ImageInfo[]>([]);

  // 이미지 업데이트 이벤트 핸들러
  const handleImageUpdate = useCallback((event: CustomEvent<{ images: ImageInfo[] }>) => {
    console.log('React: Images Updated', event.detail.images);
    setEditorImages(event.detail.images);
    // 필요한 상태 업데이트 로직 추가
  }, []);

  // 내용 업데이트 이벤트 핸들러 (양방향 바인딩 시 주의)
  const handleContentUpdate = useCallback((event: CustomEvent<{ content: string }>) => {
    // console.log('React: Content Updated', event.detail.content);
    // 외부에서 내용을 변경하지 않는 한, 이 값을 다시 state에 반영하면
    // 무한 루프가 발생할 수 있으므로 주의해야 합니다.
    // setEditorContent(event.detail.content); 
  }, []);

  useEffect(() => {
    const editorElement = editorRef.current;

    if (editorElement) {
      // --- 초기 값 설정 --- 
      // content는 attribute로 설정 (초기 마운트 시)
      // editorElement.setAttribute('content', editorContent);
      // images는 JSON 문자열로 변환하여 attribute로 설정
      // editorElement.setAttribute('images', JSON.stringify(editorImages));
      // 또는 setImages 메서드 사용 (컴포넌트 마운트 후)
      editorElement.setImages?.(editorImages);
      editorElement.setContent?.(editorContent); // 초기 콘텐츠 설정

      // --- 이벤트 리스너 등록 --- 
      // 타입 단언을 사용하여 CustomEvent 타입 명시
      const onImageUpdate = (e: Event) => handleImageUpdate(e as CustomEvent<{ images: ImageInfo[] }>);
      const onContentUpdate = (e: Event) => handleContentUpdate(e as CustomEvent<{ content: string }>);

      editorElement.addEventListener('onUpdateImage', onImageUpdate);
      editorElement.addEventListener('updateContent', onContentUpdate);
      console.log('React: Event listeners added to kirsi-editor');

      // --- 컴포넌트 언마운트 시 리스너 제거 --- 
      return () => {
        if (editorElement) {
          editorElement.removeEventListener('onUpdateImage', onImageUpdate);
          editorElement.removeEventListener('updateContent', onContentUpdate);
          console.log('React: Event listeners removed from kirsi-editor');
        }
      };
    }
  }, [handleImageUpdate, handleContentUpdate]); // 핸들러 함수 변경 시 리스너 재등록

  // --- 외부에서 에디터 제어 예시 --- 
  const handleGetContent = () => {
    if (editorRef.current?.getContent) {
      const content = editorRef.current.getContent();
      alert("Current Content:\n" + content);
    }
  };

  const handleSetContent = () => {
    if (editorRef.current?.setContent) {
      const newContent = prompt("Enter new content:", "<p>Set from React!</p>");
      if (newContent !== null) {
        editorRef.current.setContent(newContent);
        // 필요 시 React state도 동기화
        // setEditorContent(newContent);
      }
    }
  };

  return (
    <div>
      <h3>KirsiEditor in React</h3>
      {/* 웹 컴포넌트 렌더링 */}
      <kirsi-editor ref={editorRef}></kirsi-editor>

      {/* 제어 버튼 예시 */}
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={handleGetContent}>Get Content</button>
        <button onClick={handleSetContent}>Set Content</button>
      </div>

      {/* 상태 표시 예시 */}
      {/* 
      <div style={{ marginTop: '1rem' }}>
        <h4>Images State (React):</h4>
        <pre>{JSON.stringify(editorImages, null, 2)}</pre>
      </div>
      */}
    </div>
  );
}

export default MyReactEditorComponent;`}</pre>
  </div>
</div>

<style>
  .container {
    max-width: 1000px;
    margin: 2rem auto;
    padding: 0 1rem;
    font-family: sans-serif;
  }
  
  h1 {
    text-align: center;
    margin-bottom: 1.5rem;
    color: #333;
  }
  
  .editor-wrapper {
    border: 1px solid #ccc;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 2rem;
    min-height: 400px;
    display: flex;
    flex-direction: column;
  }
  
  kirsi-editor {
    display: block;
    width: 100%;
    height: 500px;
  }
  
  .loading-editor {
    padding: 2rem;
    text-align: center;
    color: #666;
    background-color: #f8f8f8;
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-style: italic;
  }
  
  .info-section {
    background-color: #f0f4f8;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    font-size: 0.9rem;
    line-height: 1.6;
  }
  
  .info-section h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #1a4a7d;
    border-bottom: 1px solid #d0d8e0;
    padding-bottom: 0.5rem;
  }
  
  .info-section h3 {
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    color: #333;
  }
  
  .info-section ul {
    padding-left: 1.2rem;
    margin-bottom: 1rem;
  }
  
  .info-section li {
    margin-bottom: 0.3rem;
  }
  
  .info-section code {
    background-color: #e2e8f0;
    padding: 0.1em 0.4em;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.85rem;
  }
  
  pre {
    background-color: #e2e8f0;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    font-family: monospace;
    font-size: 0.85rem;
    line-height: 1.5;
    color: #2d3748;
  }
</style>
