// @ts-nocheck
import KirsiEditor from './KirsiEditor.svelte';
import { mount } from 'svelte'; // Svelte 5: mount 함수 import
// highlight.js 테마 CSS 내용을 문자열로 import 
import hljsStyle from 'highlight.js/styles/atom-one-dark.css?inline'; // github.css 대신 atom-one-dark.css 사용

// No TypeScript interfaces needed in JS

class KirsiEditorElement extends HTMLElement {
    _editorInstance = null; // Svelte 5: 마운트된 컴포넌트 인스턴스
    _unmount = null; // Svelte 5: 언마운트 함수
    _content = '';
    _images = []; // Array to hold image info objects

    static get observedAttributes() {
        return ['content', 'images'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        if (!this.shadowRoot) {
            console.error('[KirsiEditorElement] Shadow root not available.');
            return;
        }

        // --- Highlight.js 스타일 주입 ---
        try {
            const style = document.createElement('style');
            style.textContent = hljsStyle; // 변경된 변수 사용
            this.shadowRoot.appendChild(style);
            console.log('[KirsiEditorElement] Injected highlight.js dark theme style into Shadow DOM.');
        } catch (error) {
            console.error('[KirsiEditorElement] Failed to inject highlight.js style:', error);
        }

        try {
            // Svelte 5: mount 함수 사용
            const mountedComponent = mount(KirsiEditor, {
                target: this.shadowRoot,
                props: {
                    initialContent: this._content,
                    initialImages: this._images,
                    hostElement: this // 웹 컴포넌트 인스턴스를 prop으로 전달
                }
            });

            console.log('[KirsiEditorElement] Component mounted, returned object:', mountedComponent); 
            // Svelte 5 mount 반환값 직접 확인
            // console.log('[KirsiEditorElement] Checking instance:', mountedComponent?.instance);
            // console.log('[KirsiEditorElement] Checking unmount function type:', typeof mountedComponent?.unmount);

            // 검사 조건 변경: mountedComponent 객체 자체를 인스턴스로 간주
            if (!mountedComponent) { 
                 console.error('[KirsiEditorElement] Failed to mount Svelte component: mount() returned invalid object.');
                 return;
            }
            // unmount 함수 존재 여부 확인 (반환된 객체 자체에 있을 수 있음)
            if (typeof mountedComponent.unmount !== 'function') {
                console.warn('[KirsiEditorElement] Warning: unmount function not found on mounted component.');
            }

            this._editorInstance = mountedComponent; // 객체 자체를 인스턴스로 할당
            // unmount 함수 할당
            this._unmount = typeof mountedComponent.unmount === 'function' ? mountedComponent.unmount : () => {}; 

            // --- 이벤트 리스너 제거 (Svelte 컴포넌트가 직접 host에서 dispatch) ---
            // console.log('[KirsiEditorElement] Attaching event listeners to shadowRoot:', this.shadowRoot); 
            // this.shadowRoot.addEventListener('updateContent', (event) => {
            //      const customEvent = new CustomEvent('change', {
            //          detail: { content: event.detail.content },
            //          bubbles: true, 
            //          composed: true 
            //      });
            //      this.dispatchEvent(customEvent);
            //      this._content = event.detail.content; 
            //      console.log('[KirsiEditorElement] Dispatched "change" event:', event.detail.content);
            // });
            // this.shadowRoot.addEventListener('updateImage', (event) => {
            //     const customEvent = new CustomEvent('changeImageList', {
            //         detail: { images: event.detail.images },
            //         bubbles: true,
            //         composed: true
            //     });
            //     this.dispatchEvent(customEvent);
            //     this._images = event.detail.images; 
            //     console.log('[KirsiEditorElement] Dispatched "changeImageList" event:', event.detail.images);
            // });
            // console.log('[KirsiEditorElement] Event listeners for updateContent and updateImage added to shadowRoot.');


            // --- 메서드 노출 --- 
            // 인스턴스의 exported 함수에 접근 (Svelte 5에서는 instance.prop 대신 instance.함수명 형태)
            this.setContent = (newContent) => {
                // instance 객체에 setContent 함수가 있는지 확인
                if (this._editorInstance && typeof this._editorInstance.setContent === 'function') {
                    this._editorInstance.setContent(newContent);
                } else {
                    console.warn('[KirsiEditorElement] setContent method not found on Svelte instance.');
                }
            };

            this.getContent = () => {
                if (this._editorInstance && typeof this._editorInstance.getContent === 'function') {
                    return this._editorInstance.getContent();
                } else {
                     console.warn('[KirsiEditorElement] getContent method not found on Svelte instance.');
                }
                return this._content;
            };

            this.getImages = () => {
                if (this._editorInstance && typeof this._editorInstance.getImages === 'function') {
                    return this._editorInstance.getImages();
                } else {
                     console.warn('[KirsiEditorElement] getImages method not found on Svelte instance.');
                }
                return this._images;
            };

            this.setImages = (newImages) => {
                if (this._editorInstance && typeof this._editorInstance.setImages === 'function') {
                    this._editorInstance.setImages(newImages);
                } else {
                    console.warn('[KirsiEditorElement] setImages method not found on Svelte instance.');
                }
            };
            console.log('[KirsiEditorElement] Methods exposed (attempted).');

        } catch (error) {
            console.error('[KirsiEditorElement] Error during connectedCallback (mount):', error);
        }
    }

    disconnectedCallback() {
        console.log('[KirsiEditorElement] Disconnecting...');
        // Svelte 5: unmount 함수 호출
        if (this._unmount) {
            try {
                this._unmount();
                console.log('[KirsiEditorElement] Component unmounted.');
            } catch (error) {
                console.error('[KirsiEditorElement] Error during unmount:', error);
            }
            this._unmount = null;
            this._editorInstance = null;
        }
        // 이벤트 리스너 제거 (필요하다면 추가)
        // this.shadowRoot?.removeEventListener(...)
    }

    attributeChangedCallback(name, oldValue, newValue) {
        console.log(`[KirsiEditorElement] Attribute changed: ${name}`, { oldValue, newValue });
         // Ensure methods are available before calling them
        if (name === 'content' && oldValue !== newValue) {
            this._content = newValue ?? '';
            // 컴포넌트가 마운트된 후에만 속성 변경 적용 & 메서드 존재 확인
            if (this._editorInstance && typeof this.setContent === 'function') {
                this.setContent(this._content);
            }
        }
        if (name === 'images' && oldValue !== newValue) {
            try {
                const parsedImages = JSON.parse(newValue || '[]');
                this._images = Array.isArray(parsedImages) ? parsedImages : [];
                 // 컴포넌트가 마운트된 후에만 속성 변경 적용 & 메서드 존재 확인
                 if (this._editorInstance && typeof this.setImages === 'function') {
                    this.setImages(this._images);
                 }
            } catch (e) {
                console.error('[KirsiEditorElement] Failed to parse images attribute:', e);
                this._images = [];
                 if (this._editorInstance && typeof this.setImages === 'function') {
                    this.setImages(this._images); // Reset images on error
                 }
            }
        }
    }

     // Define properties for methods to allow access from outside
     // These will be assigned in connectedCallback
     setContent = (newContent) => { console.warn("setContent called before initialization"); };
     getContent = () => {
         console.warn("getContent called before initialization");
         return this._content;
     };
     getImages = () => {
        console.warn("getImages called before initialization");
        return this._images;
    };
     setImages = (newImages) => { console.warn("setImages called before initialization"); };
}

// Define the custom element
if (typeof window !== 'undefined' && !customElements.get('kirsi-editor')) {
    customElements.define('kirsi-editor', KirsiEditorElement);
    console.log('[KirsiEditorElement] Custom element <kirsi-editor> defined.');
} else if (typeof window !== 'undefined') {
     console.log('[KirsiEditorElement] Custom element <kirsi-editor> already defined.');
}

export default KirsiEditorElement; 