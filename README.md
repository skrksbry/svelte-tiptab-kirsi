# Kirsi 리치 텍스트 에디터

Svelte로 개발된 웹 컴포넌트용 리치 텍스트 에디터입니다. 다양한 프로젝트에서 재사용이 가능하도록 설계되었습니다.

## 특징

- 웹 컴포넌트로 컴파일되어 다양한 프로젝트에서 사용 가능
- 작성 버튼 클릭 시 호출할 API 주소 지정 가능
- 이미지 첨부 기능 (드래그 앤 드롭, 파일 선택, URL 입력)
- 이미지 크기 조절 기능 (이미지 클릭 또는 드래그로 크기 조절)
- 헤더, 폰트 선택, 폰트 색상, 폰트 굵기, 폰트 크기 선택 기능
- TypeScript를 기본 언어로 하는 코드 블록 지원 (하이라이트 기능 포함)
- 업로드된 이미지 관리 기능
- 외부에서 이미지 리스트 주입 가능

## 설치

```bash
npm install svelte-tiptab-kirsi
```

## 사용 방법

### HTML에서 사용

```html
<script type="module">
  import 'svelte-tiptab-kirsi';
</script>

<kirsi-editor 
  api-endpoint="https://your-api.com/save" 
  content="<p>초기 내용</p>"
></kirsi-editor>

<script>
  document.querySelector('kirsi-editor').addEventListener('save', (event) => {
    console.log('저장된 내용:', event.detail.content);
    console.log('업로드된 이미지:', event.detail.images);
  });
</script>
```

### Svelte에서 컴포넌트로 사용

```svelte
<script>
  import { RichTextEditor } from 'svelte-tiptab-kirsi';
  
  let content = '<p>초기 내용</p>';
  let uploadedImages = [];
  
  function handleSave(data) {
    console.log('저장된 내용:', data.content);
    uploadedImages = data.images;
    console.log('업로드된 이미지:', uploadedImages);
  }
</script>

<RichTextEditor 
  apiEndpoint="https://your-api.com/save" 
  bind:content={content}
  onSave={handleSave}
/>
```

### React에서 웹 컴포넌트로 사용

React에서 웹 컴포넌트를 사용하려면 이벤트를 처리하기 위한 래퍼 컴포넌트를 만드는 것이 좋습니다.

```jsx
// KirsiEditor.jsx
import { useEffect, useRef, useState } from 'react';
import 'svelte-tiptab-kirsi';

const KirsiEditor = ({ 
  apiEndpoint, 
  initialContent = '', 
  initialImages = [], // 초기 이미지 배열
  onSave, 
  onImagesChange 
}) => {
  const editorRef = useRef(null);
  const [content, setContent] = useState(initialContent);
  const [images, setImages] = useState(initialImages);
  
  useEffect(() => {
    if (!editorRef.current) return;
    
    // 초기 콘텐츠 설정
    if (initialContent) {
      editorRef.current.setAttribute('content', initialContent);
    }
    
    // API 엔드포인트 설정
    if (apiEndpoint) {
      editorRef.current.setAttribute('api-endpoint', apiEndpoint);
    }
    
    // 초기 이미지 설정
    if (initialImages && initialImages.length > 0) {
      editorRef.current.setAttribute('images', JSON.stringify(initialImages));
    }
    
    // 저장 이벤트 리스너 설정
    const handleSave = (event) => {
      const savedContent = event.detail.content;
      const savedImages = event.detail.images;
      
      setContent(savedContent);
      setImages(savedImages);
      
      if (onSave) {
        onSave(savedContent);
      }
      
      if (onImagesChange) {
        onImagesChange(savedImages);
      }
    };
    
    editorRef.current.addEventListener('save', handleSave);
    
    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('save', handleSave);
      }
    };
  }, [apiEndpoint, initialContent, onSave, onImagesChange]);
  
  // 외부에서 이미지 업데이트 처리
  useEffect(() => {
    if (editorRef.current && initialImages && initialImages.length > 0) {
      if (editorRef.current.setImages) {
        editorRef.current.setImages(initialImages);
      } else {
        editorRef.current.setAttribute('images', JSON.stringify(initialImages));
      }
    }
  }, [initialImages]);
  
  return <kirsi-editor ref={editorRef} />;
};

export default KirsiEditor;
```

사용 예시:

```jsx
// App.jsx
import { useState, useEffect } from 'react';
import KirsiEditor from './KirsiEditor';

function App() {
  const [content, setContent] = useState('<p>초기 내용</p>');
  const [images, setImages] = useState([]);
  
  // 외부에서 이미지 목록을 가져오는 예시
  useEffect(() => {
    // 예시: API에서 이미지 목록을 불러오는 코드
    // fetch('/api/images')
    //   .then(res => res.json())
    //   .then(data => setImages(data));
    
    // 테스트용 더미 이미지
    setImages([
      {
        id: "img-example-1",
        src: "https://via.placeholder.com/300",
        alt: "예시 이미지",
        name: "example.jpg",
        type: "image/jpeg",
        size: 12345,
        date: new Date()
      }
    ]);
  }, []);
  
  const handleSave = (newContent) => {
    setContent(newContent);
    console.log('저장된 내용:', newContent);
  };
  
  const handleImagesChange = (newImages) => {
    setImages(newImages);
    console.log('업로드된 이미지:', newImages);
    
    // 이미지 변경 시 서버에 저장하는 예시
    // fetch('/api/save-images', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(newImages)
    // });
  };
  
  return (
    <div className="app">
      <h1>Kirsi 에디터 React 예제</h1>
      
      <KirsiEditor
        apiEndpoint="https://your-api.com/save"
        initialContent={content}
        initialImages={images}
        onSave={handleSave}
        onImagesChange={handleImagesChange}
      />
      
      {images.length > 0 && (
        <div className="images-info">
          <h3>업로드된 이미지 정보</h3>
          <ul>
            {images.map(image => (
              <li key={image.id}>
                {image.name} ({Math.round(image.size / 1024)} KB)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
```

## 속성

### 웹 컴포넌트 속성

| 속성 | 설명 |
|------|------|
| `api-endpoint` | 작성 버튼 클릭 시 데이터를 전송할 API 엔드포인트 |
| `content` | 에디터의 초기 내용 |
| `images` | 에디터에 표시할 이미지 목록 (JSON 문자열) |

### Svelte 컴포넌트 props

| Prop | 설명 |
|------|------|
| `apiEndpoint` | 작성 버튼 클릭 시 데이터를 전송할 API 엔드포인트 |
| `content` | 에디터의 초기 내용 (양방향 바인딩 가능) |
| `initialImages` | 에디터에 표시할 초기 이미지 목록 (배열) |
| `onSave` | 저장 시 호출될 콜백 함수 |

## 이벤트

| 이벤트 | 설명 |
|------|------|
| `save` | 저장 버튼 클릭 시 발생, `event.detail.content`에 에디터 내용, `event.detail.images`에 업로드된 이미지 목록이 포함됨 |

## 이미지 정보 형식

업로드된 이미지는 다음과 같은 형식의 배열로 제공됩니다:

```javascript
[
  {
    id: "img-1234567890-abc123",  // 이미지 고유 ID
    src: "data:image/jpeg;base64,...", // 이미지 데이터 (Base64)
    alt: "example.jpg",           // 이미지 대체 텍스트
    name: "example.jpg",          // 원본 파일명
    type: "image/jpeg",           // 이미지 MIME 타입
    size: 12345,                  // 파일 크기(bytes)
    date: "2023-08-15T09:30:00.000Z" // 업로드 날짜
  }
]
```

## 개발

```bash
# 종속성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

## 주요 기능 사용법

### 이미지 크기 조절

1. 이미지를 삽입한 후 이미지에 마우스를 올리면 오른쪽 하단에 크기 조절 핸들이 나타납니다.
2. 이 핸들을 드래그하여 이미지 크기를 조절할 수 있습니다.
3. 또는 이미지를 클릭하면 크기 조절 툴바가 나타나 직접 픽셀 단위로 크기를 입력할 수 있습니다.

### 코드 블록 언어 선택

1. 코드 블록을 삽입하면 기본적으로 TypeScript가 선택됩니다.
2. 코드 블록의 오른쪽 상단에 있는 언어 선택 드롭다운을 클릭하여 다른 언어로 변경할 수 있습니다.
3. 선택한 언어에 따라 코드 하이라이트가 자동으로 적용됩니다.

### 이미지 업로드 방법

1. 툴바의 이미지 버튼을 클릭하여 URL 입력 또는 파일 선택
2. 에디터 영역에 이미지 파일을 직접 드래그 앤 드롭
3. 클립보드에서 이미지 붙여넣기 (Ctrl+V)
4. 외부 소스에서 이미지 목록을 주입하여 사용 가능

### 외부에서 이미지 주입하기

1. React의 경우 `initialImages` prop을 통해 이미지 목록을 전달할 수 있습니다.
2. HTML 웹 컴포넌트에서는 `images` 속성에 JSON 문자열 형태로 이미지 목록을 전달할 수 있습니다.
3. 주입된 이미지는 에디터 상단의 이미지 목록에 표시되며, 삽입 버튼을 클릭하여 본문에 추가할 수 있습니다.

## 라이선스

MIT
