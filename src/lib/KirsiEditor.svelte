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

    interface ImageInfo {
        id: string;
        src: string; // data URL or external URL
        alt: string;
        name: string;
        type: string;
        size: number;
        file?: File; // 실제 File 객체 (선택적)
    }

    // Props
    export let initialContent: string = '';
    export let initialImages: ImageInfo[] = []; // 초기 이미지 데이터
    export let hostElement: HTMLElement | null = null; // 웹 컴포넌트 호스트 요소 참조
    export let darkMode: boolean | null = null; // 다크 모드 상태를 외부에서 명시적으로 지정할 수 있는 prop
    export let imageUploadEndpoint: string | null = null; // 이미지 업로드 API 엔드포인트
    export let maxHeight: string | number = 600; // 에디터 최대 높이 (기본 600px)

    // State
    let editorElement: HTMLDivElement;
    let editor: Editor | null = null;
    let dragActive = false;
    let uploadedImages: Writable<ImageInfo[]> = writable<ImageInfo[]>([...initialImages]);
    let content = initialContent;
    let isDarkMode = false; // 다크 모드 상태 저장 변수
    let themeClass = ''; // 테마 클래스 이름

    const dispatch = createEventDispatcher<{
        change: { content: string };
        changeImageList: { images: ImageInfo[] };
    }>();

    // 다크 모드 감지 및 테마 클래스 설정 함수
    function detectColorScheme() {
        // 1. prop으로 명시적 설정이 있는 경우 그것 사용
        if (darkMode !== null) {
            isDarkMode = darkMode;
        } 
        // 2. 부모 요소의 테마를 감지 (CSS 변수 또는 클래스를 통해)
        else if (hostElement) {
            const hostComputedStyle = window.getComputedStyle(hostElement);
            const rootOrBodyComputedStyle = window.getComputedStyle(document.documentElement);
            
            // CSS 변수로 테마 감지 시도
            const hostTheme = hostComputedStyle.getPropertyValue('--theme') || 
                              hostComputedStyle.getPropertyValue('--color-scheme') ||
                              hostComputedStyle.getPropertyValue('--mode');
                              
            const rootTheme = rootOrBodyComputedStyle.getPropertyValue('--theme') || 
                             rootOrBodyComputedStyle.getPropertyValue('--color-scheme') ||
                             rootOrBodyComputedStyle.getPropertyValue('--mode');

            // 일반적인 다크 모드 클래스 확인
            const hostHasDarkClass = hostElement.classList.contains('dark') || 
                                   hostElement.classList.contains('theme-dark') ||
                                   hostElement.classList.contains('darkmode');
                                   
            const documentHasDarkClass = document.documentElement.classList.contains('dark') || 
                                       document.body.classList.contains('dark') ||
                                       document.documentElement.classList.contains('theme-dark') ||
                                       document.body.classList.contains('theme-dark');

            // 클래스나 CSS 변수에서 다크 모드 감지
            if (hostTheme?.includes('dark') || rootTheme?.includes('dark') || 
                hostHasDarkClass || documentHasDarkClass) {
                isDarkMode = true;
            }
            // 3. 감지 실패 시 시스템 기본 설정 사용
            else {
                isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
        }
        // 4. hostElement가 없는 경우 시스템 기본 설정 사용
        else {
            isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        // 테마 클래스 설정
        themeClass = isDarkMode ? 'kirsi-dark-theme' : 'kirsi-light-theme';
        console.log(`[KirsiEditor] Theme detected: ${isDarkMode ? 'dark' : 'light'}`);
    }

    // 시스템 다크 모드 변경 감지 리스너
    let colorSchemeMediaQuery: MediaQueryList;
    function setupColorSchemeListener() {
        colorSchemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // 변경 감지 리스너 설정
        const handleColorSchemeChange = (e: MediaQueryListEvent) => {
            // 외부에서 명시적으로 설정한 경우 무시
            if (darkMode === null) {
                isDarkMode = e.matches;
                themeClass = isDarkMode ? 'kirsi-dark-theme' : 'kirsi-light-theme';
                console.log(`[KirsiEditor] System color scheme changed: ${isDarkMode ? 'dark' : 'light'}`);
            }
        };

        // 리스너 등록
        if (colorSchemeMediaQuery.addEventListener) {
            colorSchemeMediaQuery.addEventListener('change', handleColorSchemeChange);
        } else if (colorSchemeMediaQuery.addListener) {
            // Safari/iOS 13 이하 지원
            colorSchemeMediaQuery.addListener(handleColorSchemeChange);
        }

        // cleanup 함수 반환
        return () => {
            if (colorSchemeMediaQuery.removeEventListener) {
                colorSchemeMediaQuery.removeEventListener('change', handleColorSchemeChange);
            } else if (colorSchemeMediaQuery.removeListener) {
                colorSchemeMediaQuery.removeListener(handleColorSchemeChange);
            }
        };
    }

    // darkMode prop이 변경될 때 테마 업데이트
    $: if (darkMode !== null) {
        isDarkMode = darkMode;
        themeClass = isDarkMode ? 'kirsi-dark-theme' : 'kirsi-light-theme';
        console.log(`[KirsiEditor] Theme set by prop: ${isDarkMode ? 'dark' : 'light'}`);
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

    // API를 통해 이미지를 업로드하는 함수
    async function uploadImageToServer(file: File): Promise<{success: boolean, url?: string, error?: string}> {
        if (!imageUploadEndpoint) {
            return { success: false, error: '업로드 엔드포인트가 설정되지 않았습니다.' };
        }

        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch(imageUploadEndpoint, {
                method: 'POST',
                body: formData,
                // credentials: 'include', // 필요한 경우 주석 해제
            });

            if (!response.ok) {
                throw new Error(`업로드 실패: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // 서버 응답 구조에 따라 URL을 추출하는 방식을 조정해야 할 수 있습니다.
            // 여기서는 일반적인 { url: "이미지URL" } 형식을 가정합니다.
            if (data && data.url) {
                console.log('[KirsiEditor] 이미지 업로드 성공:', data.url);
                return { success: true, url: data.url };
            } else {
                console.error('[KirsiEditor] 이미지 업로드 응답에 URL이 없습니다:', data);
                return { success: false, error: '서버 응답에 이미지 URL이 없습니다.' };
            }
        } catch (error) {
            console.error('[KirsiEditor] 이미지 업로드 오류:', error);
            return { success: false, error: error instanceof Error ? error.message : '이미지 업로드 중 오류가 발생했습니다.' };
        }
    }

    interface AddImageEventDetail {
        file?: File;
        src?: string;
        alt?: string;
    }

    // 이미지 파일 또는 URL로부터 이미지 처리
    async function handleAddImage({ detail }: CustomEvent<AddImageEventDetail>) {
        const { file, src, alt } = detail;
        const imageId = generateImageId();

        if (file) {
            // 이미지 업로드 엔드포인트가 설정되어 있으면 서버에 업로드
            if (imageUploadEndpoint) {
                const result = await uploadImageToServer(file);
                
                if (result.success && result.url) {
                    // 서버에서 반환된 URL로 이미지 정보 생성
                    const imageInfo: ImageInfo = {
                        id: imageId,
                        src: result.url,
                        alt: file.name,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                    };
                    
                    addImageToList(imageInfo);
                    insertImageIntoEditor(imageId, result.url, file.name);
                } else {
                    // 업로드 실패 시 fallback으로 base64 사용 (선택사항)
                    console.error('[KirsiEditor] 서버 업로드 실패, base64로 전환:', result.error);
                    processImageAsBase64(file, imageId);
                }
            } else {
                // 업로드 엔드포인트가 없으면 base64로 처리
                processImageAsBase64(file, imageId);
            }
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

    // Base64로 이미지 처리하는 함수
    function processImageAsBase64(file: File, imageId: string) {
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
    }

    // 이미지 리스트에서 이미지 제거
    async function handleRemoveImage({ detail }: CustomEvent<{ id: string }>) {
        const { id } = detail;
        console.log(`[KirsiEditor] Received remove image request for ID: ${id}`);

        // 1. 이미지 목록(uploadedImages store)에서 제거
        uploadedImages.update(list => list.filter(img => img.id !== id));
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

    interface InsertImageEventDetail {
        id: string;
        src: string;
        alt: string;
    }

    // 이미지 리스트에서 이미지 삽입 요청 처리
    function handleInsertImage({ detail }: CustomEvent<InsertImageEventDetail>) {
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
             e.dataTransfer.dropEffect = 'copy';
        }
    }
    function handleDragLeave(e: DragEvent) {
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
                        handleAddImage({ detail: { file } } as CustomEvent<AddImageEventDetail>);
                    }
                }
            }
        }
    }

    // --- 이미지 리사이징 --- (Tiptap 노드뷰 대신 직접 DOM 조작 방식)
    let isResizing = false;
    let startX: number, startY: number, startWidth: number, startHeight: number, targetImage: HTMLImageElement | null = null;

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
            const wrapper = targetImage.closest('.image-wrapper');
            if (wrapper) {
                const pos = view.posAtDOM(wrapper, 0);
                if (pos !== undefined) {
                     const transaction = editor.state.tr.setNodeMarkup(pos, undefined, {
                        ...editor.state.doc.nodeAt(pos)?.attrs,
                        width: targetImage.style.width || null, // 변경된 너비 저장
                        height: 'auto' // 높이는 auto로 고정
                    });
                    view.dispatch(transaction);
                }
            }
        }
         targetImage = null;
    }

    // --- 라이프사이클 및 에디터 초기화 ---
    onMount(async () => {
        detectColorScheme();
        const cleanupColorSchemeListener = setupColorSchemeListener();

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
                 hostElement?.dispatchEvent(new CustomEvent('change', {
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
                                 return true; // 계속 순회
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
            },
        });

        setTimeout(() => {
             initializeImageResizing();
        }, 150); 

         const shadowHost = editorElement.getRootNode() as ShadowRoot;
         if (shadowHost && shadowHost.host) {
            (shadowHost.host as any).setContent = (newContent: string) => {
                editor?.commands.setContent(newContent, false);
            };
            (shadowHost.host as any).getContent = () => {
                return editor?.getHTML() || '';
            };
            (shadowHost.host as any).getImages = () => {
                return $uploadedImages;
            };
            (shadowHost.host as any).setImages = (newImages: ImageInfo[]) => {
                uploadedImages.set(newImages);
            };
            (shadowHost.host as any).setDarkMode = (dark: boolean) => {
                darkMode = dark;
                isDarkMode = dark;
                themeClass = isDarkMode ? 'kirsi-dark-theme' : 'kirsi-light-theme';
            };
            (shadowHost.host as any).isDarkMode = () => {
                return isDarkMode;
            };
            // 자동 다크 모드 감지 메소드 추가
            (shadowHost.host as any).useAutoDarkMode = () => {
                darkMode = null; // prop 설정 해제
                detectColorScheme(); // 시스템이나 부모 요소의 테마 감지
            };
            // 이미지 업로드 엔드포인트 설정 메소드 추가
            (shadowHost.host as any).setImageUploadEndpoint = (endpoint: string) => {
                imageUploadEndpoint = endpoint;
                console.log('[KirsiEditor] 이미지 업로드 엔드포인트 설정:', endpoint);
            };
            // 현재 이미지 업로드 엔드포인트 확인 메소드 추가
            (shadowHost.host as any).getImageUploadEndpoint = () => {
                return imageUploadEndpoint;
            };
         }

        return () => {
            cleanupColorSchemeListener();
        };
    });

    onDestroy(() => {
        editor?.destroy();
    });

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
         hostElement?.dispatchEvent(new CustomEvent('changeImageList', {
             detail: { images: newImages },
             bubbles: true,
             composed: true
         }));
         console.log('[KirsiEditor.svelte] Dispatched changeImageList from host via setImages:', newImages);
    }

    export function toggleDarkMode(): void {
        isDarkMode = !isDarkMode;
        themeClass = isDarkMode ? 'kirsi-dark-theme' : 'kirsi-light-theme';
    }

    export function setDarkMode(dark: boolean): void {
        darkMode = dark;
        isDarkMode = dark;
        themeClass = isDarkMode ? 'kirsi-dark-theme' : 'kirsi-light-theme';
    }

    // 이미지 업로드 엔드포인트 설정 함수
    export function setImageUploadEndpoint(endpoint: string): void {
        imageUploadEndpoint = endpoint;
    }
    
    // 현재 이미지 업로드 엔드포인트 반환 함수
    export function getImageUploadEndpoint(): string | null {
        return imageUploadEndpoint;
    }

</script>

<div class="kirsi-editor-wrapper {themeClass}">
    {#if editor}
        <Toolbar {editor} on:addImage={handleAddImage} {isDarkMode} />
    {/if}

    <ImageList images={$uploadedImages} on:removeImage={handleRemoveImage} on:insertImage={handleInsertImage} {isDarkMode} />

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="editor-container"
        class:drag-active={dragActive}
        on:dragenter={handleDragEnter}
        on:dragleave={handleDragLeave}
        on:dragover={handleDragOver}
        on:drop={handleDrop}
        style="max-height: {maxHeight}px;"
    >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div 
            bind:this={editorElement} 
            class="editor-content"
            on:click={(e) => {
                if (!editor?.isFocused) {
                    editor?.chain()
                        .focus('end') // 마지막 위치에 커서를 위치시킴
                        .run();
                }
            }}
        ></div>
        {#if dragActive}
            <div class="drop-overlay">
                <div class="drop-message">이미지를 여기에 놓으세요</div>
            </div>
        {/if}
    </div>
</div>

<style>
    .kirsi-editor-wrapper {
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: auto; /* 컨텐츠에 맞게 자동 조절되도록 변경 */
        min-height: 500px; /* 최소 높이 설정 */
    }

    /* 라이트 모드 스타일 (기본) */
    .kirsi-light-theme {
        background-color: #ffffff;
        color: #333333;
    }

    /* 다크 모드 스타일 */
    .kirsi-dark-theme {
        background-color: #1e1e1e;
        color: #e0e0e0;
        border-color: #444444;
    }

    .kirsi-dark-theme :global(.ProseMirror) {
        color: #e0e0e0;
    }

    .kirsi-dark-theme :global(.ProseMirror a) {
        color: #60a5fa; /* 다크 모드에서 링크 색상 */
    }

    .editor-container {
        position: relative; /* for drop overlay */
        flex-grow: 1;
        overflow-y: auto; /* 최대 높이를 초과할 경우에만 스크롤 활성화 */
    }

    /* 다크 모드에서 에디터 컨테이너 */
    .kirsi-dark-theme .editor-container {
        background-color: #1e1e1e;
    }

    .editor-content {
        padding: 1rem;
        outline: none;
        min-height: 100px; /* 최소 높이 줄임 */
        height: auto; /* 컨텐츠에 따라 자동으로 높이 조절 */
        cursor: text;
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

    /* 다크 모드 드롭 오버레이 조정 */
    .kirsi-dark-theme .drop-overlay {
        background-color: rgba(0, 120, 255, 0.15);
        border-color: #60a5fa;
    }

    .drop-message {
        background-color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        font-weight: bold;
        color: #007bff;
    }

    /* 다크 모드 드롭 메시지 */
    .kirsi-dark-theme .drop-message {
        background-color: #2d2d2d;
        color: #60a5fa;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
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

    /* 다크 모드 이미지 테두리 조정 */
    :global(.kirsi-dark-theme .image-wrapper img.resizing) {
        border-color: #60a5fa;
    }
    :global(.kirsi-dark-theme .image-wrapper:hover img:not(.resizing)) {
        border-color: #60a5fa;
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

    /* 다크 모드 리사이즈 핸들 스타일 */
    :global(.kirsi-dark-theme .resize-handle) {
        background-color: #60a5fa;
        border-color: #2d2d2d;
    }

    :global(.image-wrapper:hover .resize-handle) {
        opacity: 1;
    }

    /* Tiptap CodeBlockLowlight 기본 스타일 + 테마 호환성 */
    :global(.ProseMirror pre) {
        font-family: 'JetBrainsMono', monospace;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        margin: 1em 0;
        white-space: pre;
        overflow-x: auto;
        background-color: #f6f8fa; /* 라이트 모드 기본 코드 배경 */
        position: relative; /* 언어 선택기 위치 잡기 위해 추가 */
    }

    /* 다크 모드 코드 블록 스타일 */
    :global(.kirsi-dark-theme .ProseMirror pre) {
        background-color: #2d2d2d; /* 다크 모드 코드 배경 */
    }

    :global(.ProseMirror pre code) { 
        display: block; 
        padding: 0;
        border: none;
        font-size: 0.85em;
        background: none; 
    }
    
    /* 코드 블록 언어 선택기 스타일 */
    :global(.code-language-select-button) {
        position: absolute;
        top: 4px;
        right: 8px;
        background-color: transparent;
        padding: 2px 4px;
        font-size: 12px;
        color: #666;
        cursor: pointer;
        z-index: 5;
        transition: all 0.2s ease;
        user-select: none;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        align-items: center;
        gap: 4px;
        border: none;
    }
    
    :global(.kirsi-dark-theme .code-language-select-button) {
        color: #aaa;
    }
    
    :global(.code-language-select-button:hover) {
        color: #333;
    }
    
    :global(.kirsi-dark-theme .code-language-select-button:hover) {
        color: #fff;
    }
    
    :global(.code-language-text) {
        font-size: 12px;
    }
    
    :global(.code-language-arrow) {
        font-size: 10px;
        margin-left: 2px;
    }
    
    :global(.code-language-select-menu) {
        min-width: 120px;
        max-height: 300px;
        overflow-y: auto;
        background-color: white;
        border: 1px solid #d0d0d0;
        border-radius: 4px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    
    :global(.kirsi-dark-theme .code-language-select-menu) {
        background-color: #333;
        border-color: #555;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    }
    
    :global(.code-language-option) {
        padding: 4px 12px;
        font-size: 12px;
        color: #333;
        cursor: pointer;
    }
    
    :global(.kirsi-dark-theme .code-language-option) {
        color: #e0e0e0;
    }
    
    :global(.code-language-option:hover) {
        background-color: #f0f0f0;
    }
    
    :global(.kirsi-dark-theme .code-language-option:hover) {
        background-color: #444;
    }
    
    :global(.code-language-option.selected) {
        background-color: #e0e0e0;
        font-weight: bold;
    }
    
    :global(.kirsi-dark-theme .code-language-option.selected) {
        background-color: #555;
    }

</style>