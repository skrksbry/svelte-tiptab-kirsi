<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { Editor, type EditorEvents } from '@tiptap/core';
    import StarterKit from '@tiptap/starter-kit';
    import ImageExtension from '@tiptap/extension-image';
    import Link from '@tiptap/extension-link';
    import Heading from '@tiptap/extension-heading';
    import TextStyle from '@tiptap/extension-text-style';
    import FontFamily from '@tiptap/extension-font-family';
    import Color from '@tiptap/extension-color';
    import Underline from '@tiptap/extension-underline';
    import TextAlign from '@tiptap/extension-text-align';
    import { writable, type Writable } from 'svelte/store';

    import Toolbar from './Toolbar.svelte';
    import ImageList from './ImageList.svelte';
    import FontSize from './extensions/FontSize';
    import { CustomCodeBlock } from './extensions/codeBlockConfig';
    import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';

    // Props
    export let initialContent: string = '';
    export let initialImages: ImageInfo[] = []; // 초기 이미지 데이터
    export let hostElement: HTMLElement | null = null; // 웹 컴포넌트 호스트 요소 참조

    // State
    let editorElement: HTMLDivElement;
    let editor: Editor | null = null;
    let dragActive = false;
    let uploadedImages: Writable<ImageInfo[]> = writable<ImageInfo[]>([...initialImages]);
    let content = initialContent;

    const dispatch = createEventDispatcher();

    interface ImageInfo {
        id: string;
        src: string; // data URL or external URL
        alt: string;
        name: string;
        type: string;
        size: number;
        file?: File; // 실제 File 객체 (선택적)
    }

    // --- Tiptap 이미지 확장 커스터마이징 ---
    const CustomImage = ImageExtension.extend({
        addAttributes() {
            return {
                ...this.parent?.(),
                width: {
                    default: null,
                    parseHTML: element => element.getAttribute('width'),
                    renderHTML: attributes => ({
                        width: attributes.width
                    }),
                },
                height: {
                    default: 'auto', // 기본적으로 높이는 자동으로 설정
                    parseHTML: element => element.getAttribute('height'),
                    renderHTML: attributes => ({
                        height: attributes.height,
                    }),
                },
                'data-image-id': {
                    default: null,
                    parseHTML: element => element.getAttribute('data-image-id'),
                    renderHTML: attributes => ({
                        'data-image-id': attributes['data-image-id'],
                    }),
                }
            };
        },
        // 이미지 렌더링 방식을 수정하여 리사이즈 핸들 추가 준비
        renderHTML({ HTMLAttributes }) {
            return ['span', { class: 'image-wrapper' }, ['img', HTMLAttributes]];
        },
    });

    // --- 이미지 관련 함수 ---
    function generateImageId(): string {
        return `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    // 이미지 정보 리스트에 추가하고 이벤트 발생
    function addImageToList(imageInfo: ImageInfo) {
        uploadedImages.update(list => {
            // 중복 체크 (같은 ID나 src를 가진 이미지가 있는지 확인)
            if (!list.some(img => img.id === imageInfo.id || img.src === imageInfo.src)) {
                return [...list, imageInfo];
            }
            return list;
        });
        // dispatch('updateImage', { images: $uploadedImages }); // 기존 dispatch 주석 처리
        hostElement?.dispatchEvent(new CustomEvent('changeImageList', { // hostElement에서 직접 dispatch
            detail: { images: $uploadedImages },
            bubbles: true,
            composed: true
        }));
        console.log('[KirsiEditor.svelte] Dispatched changeImageList from host after adding:', $uploadedImages);
    }

    // 본문에 이미지 삽입
    function insertImageIntoEditor(id: string, src: string, alt: string) {
        editor?.chain().focus().setImage({
            src: src,
            alt: alt,
            'data-image-id': id
        }).run();
        // 이미지 삽입 후 리사이즈 핸들러 추가 (약간의 지연 시간 후)
        setTimeout(initializeImageResizing, 50);
    }

    // 이미지 파일 또는 URL로부터 이미지 처리
    async function handleAddImage({ detail }: CustomEvent<{ file?: File, src?: string, alt?: string }>) {
        const { file, src, alt } = detail;
        const imageId = generateImageId();

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                if (result) {
                    const imageInfo: ImageInfo = {
                        id: imageId,
                        src: result,
                        alt: file.name,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        file: file
                    };
                    addImageToList(imageInfo);
                    insertImageIntoEditor(imageId, result, file.name);
                }
            };
            reader.onerror = (e) => {
                console.error("File reading error:", e);
            };
            reader.readAsDataURL(file);
        } else if (src) {
             const imageInfo: ImageInfo = {
                id: imageId,
                src: src,
                alt: alt || '이미지',
                name: alt || src.split('/').pop() || 'image',
                type: 'url', // URL 타입 표시
                size: 0, // URL은 사이즈 측정 불가
            };
            addImageToList(imageInfo);
            insertImageIntoEditor(imageId, src, alt || '이미지');
        }
    }

    // 이미지 리스트에서 이미지 제거
    async function handleRemoveImage({ detail }: CustomEvent<{ id: string }>) {
        const { id } = detail;
        console.log(`[KirsiEditor] Received remove image request for ID: ${id}`);

        // 1. 이미지 목록(uploadedImages store)에서 제거
        uploadedImages.update(list => list.filter(img => img.id !== id));
        // dispatch('updateImage', { images: $uploadedImages }); // 기존 dispatch 주석 처리
        hostElement?.dispatchEvent(new CustomEvent('changeImageList', { // hostElement에서 직접 dispatch
            detail: { images: $uploadedImages },
            bubbles: true,
            composed: true
        }));
        console.log('[KirsiEditor.svelte] Dispatched changeImageList from host after removing:', $uploadedImages);

        // 2. 에디터 본문에서 해당 ID를 가진 모든 이미지 노드 삭제
        if (editor) {
            const { state, view } = editor;
            const positionsToDelete: number[] = []; // 삭제할 노드의 원본 위치 저장

            // 현재 문서(state.doc)에서 삭제할 이미지 노드의 위치를 모두 찾음
            state.doc.descendants((node, pos) => {
                if (node.type.name === 'image' && node.attrs['data-image-id'] === id) {
                    console.log(`[KirsiEditor] Found image node with ID ${id} at pos ${pos} to delete.`);
                    positionsToDelete.push(pos);
                }
                return true; // 계속 순회
            });

            // 삭제할 위치가 있다면 트랜잭션 생성 및 디스패치
            if (positionsToDelete.length > 0) {
                // 위치 배열을 역순으로 정렬 (뒤에서부터 삭제해야 안전)
                positionsToDelete.sort((a, b) => b - a);
                console.log(`[KirsiEditor] Positions to delete (reversed):`, positionsToDelete);

                // 새로운 트랜잭션 시작
                let tr = state.tr;

                // 정렬된 위치를 순회하며 삭제 단계를 트랜잭션에 추가
                positionsToDelete.forEach(pos => {
                    // 현재 트랜잭션 상태가 아닌, *원본* state.doc 기준으로 노드 크기 확인
                    const node = state.doc.nodeAt(pos);
                    if (node) {
                         console.log(`[KirsiEditor] Adding delete step for original pos ${pos} (size: ${node.nodeSize})`);
                         // deleteRange를 사용하여 해당 위치의 노드를 삭제하는 단계를 추가
                         // tr은 변경되지만, 다음 반복의 pos는 원본 문서 기준임
                         tr = tr.deleteRange(pos, pos + node.nodeSize);
                    } else {
                         console.warn(`[KirsiEditor] Node not found at original pos ${pos} in state.doc, skipping deletion step.`);
                    }
                });

                // 모든 삭제 단계가 추가된 트랜잭션을 디스패치 (변경 사항이 있을 경우에만)
                if (tr.docChanged) {
                    console.log('[KirsiEditor] Dispatching transaction with delete steps.');
                    view.dispatch(tr);
                } else {
                    console.log('[KirsiEditor] Transaction created but no document changes detected.');
                }
            } else {
                console.log(`[KirsiEditor] No image nodes with ID ${id} found in content.`);
            }
        }
    }

    // 이미지 리스트에서 이미지 삽입 요청 처리
    function handleInsertImage({ detail }: CustomEvent<{ id: string, src: string, alt: string }>) {
        insertImageIntoEditor(detail.id, detail.src, detail.alt);
    }

    // --- 드래그 앤 드롭 --- (탐색기 -> 에디터 만 허용)
    function handleDragEnter(e: DragEvent) {
        if (e.dataTransfer?.types.includes('Files')) {
            e.preventDefault();
            e.stopPropagation();
            dragActive = true;
        }
    }
    function handleDragOver(e: DragEvent) {
        if (e.dataTransfer?.types.includes('Files')) {
            e.preventDefault();
            e.stopPropagation();
             // 드롭 허용 표시 (필수는 아님)
            e.dataTransfer.dropEffect = 'copy';
        }
    }
    function handleDragLeave(e: DragEvent) {
         // 관련 요소가 에디터 영역 밖이면 비활성화
        if (!editorElement.contains(e.relatedTarget as Node)) {
            dragActive = false;
        }
    }
    function handleDrop(e: DragEvent) {
        if (e.dataTransfer?.types.includes('Files')) {
            e.preventDefault();
            e.stopPropagation();
            dragActive = false;

            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                for (const file of files) {
                    if (file.type.startsWith('image/')) {
                        handleAddImage({ detail: { file } } as CustomEvent);
                    }
                }
            }
        }
    }

    // --- 이미지 리사이징 --- (Tiptap 노드뷰 대신 직접 DOM 조작 방식)
    let isResizing = false;
    let startX: number, startY: number, startWidth: number, startHeight: number, targetImage: HTMLImageElement | null;

    function initializeImageResizing() {
        if (!editorElement) return;

        const imageWrappers = editorElement.querySelectorAll<HTMLSpanElement>('.image-wrapper:not(.resizable)');

        imageWrappers.forEach(wrapper => {
            wrapper.classList.add('resizable'); // 중복 초기화 방지
            const img = wrapper.querySelector('img');
            if (!img) return;

            // 리사이즈 핸들 생성
            const handle = document.createElement('span');
            handle.className = 'resize-handle';
            wrapper.appendChild(handle);

            // 리사이즈 시작 이벤트
            handle.addEventListener('mousedown', (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                isResizing = true;
                targetImage = img;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = img.offsetWidth;
                startHeight = img.offsetHeight;
                document.addEventListener('mousemove', handleResizing);
                document.addEventListener('mouseup', stopResizing);
                img.classList.add('resizing');
            });
        });
    }

    function handleResizing(e: MouseEvent) {
        if (!isResizing || !targetImage) return;
        const dx = e.clientX - startX;
        // 너비만 조절, 높이는 auto
        const newWidth = Math.max(50, startWidth + dx); // 최소 너비 50px
        targetImage.style.width = `${newWidth}px`;
        targetImage.style.height = 'auto';
    }

    function stopResizing(e: MouseEvent) {
        if (!isResizing || !targetImage) return;
        isResizing = false;
        document.removeEventListener('mousemove', handleResizing);
        document.removeEventListener('mouseup', stopResizing);
        targetImage.classList.remove('resizing');

        // Tiptap 상태 업데이트
        if (editor) {
            const { view } = editor;
            // DOM 위치로부터 Tiptap 노드 위치 찾기 (약간 부정확할 수 있음)
            const pos = view.posAtDOM(targetImage.closest('.image-wrapper')!, 0);
            if (pos !== undefined) {
                 const transaction = editor.state.tr.setNodeMarkup(pos, undefined, {
                    ...editor.state.doc.nodeAt(pos)?.attrs,
                    width: targetImage.style.width || null, // 변경된 너비 저장
                    height: 'auto' // 높이는 auto로 고정
                });
                view.dispatch(transaction);
            }
        }
         targetImage = null;
    }

    // --- 라이프사이클 및 에디터 초기화 ---
    onMount(async () => {
        editor = new Editor({
            element: editorElement,
            extensions: [
                StarterKit.configure({
                    codeBlock: false,
                    heading: { levels: [1, 2, 3] },
                }),
                CustomImage.configure({
                    inline: true,
                    allowBase64: true,
                }),
                Link.configure({
                    openOnClick: false,
                    autolink: true,
                    linkOnPaste: true,
                }),
                TextStyle,
                FontFamily,
                FontSize,
                Color,
                Underline,
                TextAlign.configure({
                    types: ['heading', 'paragraph'],
                }),
                CustomCodeBlock,
            ],
            content: content,
            onUpdate: ({ editor: currentEditor }) => {
                 content = currentEditor.getHTML();
                 // dispatch('updateContent', { content: content }); // 기존 dispatch 주석 처리
                 hostElement?.dispatchEvent(new CustomEvent('change', { // hostElement에서 직접 dispatch
                     detail: { content: content },
                     bubbles: true,
                     composed: true
                 }));
                 console.log('[KirsiEditor.svelte] Dispatched change from host:', content);
            },
            onTransaction: ({ editor: currentEditor, transaction }) => {
                 let imageModified = false;
                 if (transaction.docChanged) {
                     transaction.steps.forEach(step => {
                         const stepMap = step.getMap();
                         stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
                             currentEditor.state.doc.nodesBetween(newStart, newEnd, (node, pos) => {
                                 if (node.type.name === 'image') imageModified = true;
                             });
                             if (step.from !== step.to && step.slice?.content?.size === 0) {
                                 const nodeBefore = currentEditor.state.doc.nodeAt(step.from);
                                 if (nodeBefore?.type.name === 'image') imageModified = true;
                             }
                         });
                     });
                     if (imageModified) {
                         console.log('[KirsiEditor] Image modified, updating resize handlers.');
                         setTimeout(initializeImageResizing, 100);
                     }
                 }
            }
        });

        // 초기 UI 설정
        setTimeout(() => {
             initializeImageResizing();
        }, 150); 

        // 웹 컴포넌트 API 노출 (기존 코드 유지)
         const hostElement = editorElement.getRootNode() as ShadowRoot;
         if (hostElement && hostElement.host) {
            (hostElement.host as any).setContent = (newContent: string) => {
                editor?.commands.setContent(newContent, false);
            };
             (hostElement.host as any).getContent = () => {
                return editor?.getHTML() || '';
            };
             (hostElement.host as any).getImages = () => {
                return $uploadedImages;
            };
             (hostElement.host as any).setImages = (newImages: ImageInfo[]) => {
                uploadedImages.set(newImages);
                 // Set images may require updating editor content if images were removed
                 // This part needs careful implementation based on how you want to handle synchronization
            };
         }
    });

    onDestroy(() => {
        editor?.destroy();
    });

    // Public API for Svelte component usage (if needed)
    export function getContent(): string {
        return editor?.getHTML() || '';
    }
    export function setContent(newContent: string): void {
        editor?.commands.setContent(newContent, false);
    }
    export function getImages(): ImageInfo[] {
        return $uploadedImages;
    }
    export function setImages(newImages: ImageInfo[]): void {
         uploadedImages.set(newImages);
         // dispatch('updateImage', { images: newImages }); // 기존 dispatch 주석 처리
         hostElement?.dispatchEvent(new CustomEvent('changeImageList', { // hostElement에서 직접 dispatch
             detail: { images: newImages },
             bubbles: true,
             composed: true
         }));
         console.log('[KirsiEditor.svelte] Dispatched changeImageList from host via setImages:', newImages);
         // Potentially remove images from editor content if they are no longer in the list
         // This logic needs careful consideration based on desired behavior.
    }

</script>

<div class="kirsi-editor-wrapper">
    {#if editor}
        <Toolbar {editor} on:addImage={handleAddImage} />
    {/if}

    <ImageList images={$uploadedImages} on:removeImage={handleRemoveImage} on:insertImage={handleInsertImage} />

    <div
        class="editor-container"
        class:drag-active={dragActive}
        on:dragenter={handleDragEnter}
        on:dragleave={handleDragLeave}
        on:dragover={handleDragOver}
        on:drop={handleDrop}
    >
        <div bind:this={editorElement} class="editor-content"></div>
        {#if dragActive}
            <div class="drop-overlay">
                <div class="drop-message">이미지를 여기에 놓으세요</div>
            </div>
        {/if}
    </div>
</div>

<style>
    .kirsi-editor-wrapper {
        border: 1px solid #ccc;
        border-radius: 4px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%; /* 필요에 따라 높이 조절 */
    }

    .editor-container {
        position: relative; /* for drop overlay */
        flex-grow: 1;
        overflow-y: auto; /* 스크롤 추가 */
    }

    .editor-content {
        padding: 1rem;
        min-height: 200px; /* 최소 높이 설정 */
         outline: none;
    }

     /* 기본 ProseMirror 스타일 */
    :global(.ProseMirror) {
        outline: none;
    }
    :global(.ProseMirror p) {
        margin: 0.5em 0;
    }
    :global(.ProseMirror h1, .ProseMirror h2, .ProseMirror h3) {
        margin: 1em 0 0.5em;
        font-weight: 600;
    }
    :global(.ProseMirror h1) { font-size: 1.8em; }
    :global(.ProseMirror h2) { font-size: 1.5em; }
    :global(.ProseMirror h3) { font-size: 1.2em; }

    :global(.ProseMirror ul, .ProseMirror ol) {
        padding-left: 1.5em;
        margin: 0.5em 0;
    }
    :global(.ProseMirror li > p) {
        margin: 0; /* 리스트 항목 내 단락 마진 제거 */
    }

    :global(.ProseMirror a) {
        color: #007bff;
        text-decoration: underline;
        cursor: pointer;
    }

    /* 드래그 앤 드롭 오버레이 */
    .editor-container.drag-active {
        /* background-color: rgba(0, 120, 255, 0.05); */
    }
    .drop-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 120, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none; /* 중요: 드롭 이벤트가 하위 요소로 전달되도록 */
        z-index: 10;
        border: 2px dashed #007bff;
        border-radius: 4px;
    }
    .drop-message {
        background-color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        font-weight: bold;
        color: #007bff;
    }

    /* 이미지 리사이징 스타일 */
    :global(.image-wrapper) {
        position: relative;
        display: inline-block; /* 이미지가 줄바꿈되지 않도록 */
        line-height: 0; /* 추가 여백 제거 */
        max-width: 100%;
        vertical-align: middle;
    }
    :global(.image-wrapper img) {
        display: block;
        max-width: 100%;
        height: auto;
        cursor: pointer;
        border: 1px solid transparent; /* 기본 테두리 투명 */
    }
    :global(.image-wrapper img.resizing) {
        cursor: nwse-resize;
        border: 1px dashed #007bff;
        opacity: 0.7;
    }
    :global(.image-wrapper:hover img:not(.resizing)) {
         border: 1px solid #007bff;
    }

    :global(.resize-handle) {
        position: absolute;
        bottom: 0px;
        right: 0px;
        width: 12px;
        height: 12px;
        background-color: #007bff;
        border: 1px solid white;
        border-radius: 2px;
        cursor: nwse-resize;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 5;
    }
    :global(.image-wrapper:hover .resize-handle) {
        opacity: 1;
    }

    /* 코드 블록 관련 :global 스타일 제거 */
    /* :global(.ProseMirror .code-block) { ... } */
    /* :global(.code-language-select-container) { ... } */
    /* :global(.code-language-select) { ... } */

     /* Tiptap CodeBlockLowlight 기본 스타일 + 테마 호환성 */
    :global(.ProseMirror pre) {
        font-family: 'JetBrainsMono', monospace;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        margin: 1em 0;
        white-space: pre;
        overflow-x: auto;
        /* 테마 적용 위해 배경/색상 제거 */
    }
    :global(.ProseMirror pre code) { 
        display: block; 
        padding: 0;
        border: none;
        font-size: 0.85em;
        background: none; 
        /* color: inherit; /* 테마 색상 적용 안 될 시 이 줄 제거 */
    }

    /* 외부에서 Highlight.js 테마 CSS 로드 (웹 컴포넌트 내부 주입 방식으로 변경됨) */

</style> 