// @ts-nocheck
import KirsiEditor from './KirsiEditor.svelte';
import { mount } from 'svelte'; // Svelte 5: mount 함수 import
// highlight.js 테마 CSS 내용을 문자열로 import
import hljsStyle from 'highlight.js/styles/atom-one-dark.css?inline'; // github.css 대신 atom-one-dark.css 사용

// 허용할 도메인 목록 (예: 개발 환경 및 프로덕션 도메인)
const ALLOWED_HOSTNAMES = [
	'localhost', // 로컬 개발 환경
	'127.0.0.1', // 로컬 개발 환경
	'138.2.125.193',
	'blog.silvercherry.io',
	'curly-potato-55jrj56gj5h7x7v-5174.app.github.dev',
];

class KirsiEditorElement extends HTMLElement {
	_editorInstance = null; // Svelte 5: 마운트된 컴포넌트 인스턴스
	_unmount = null; // Svelte 5: 언마운트 함수
	_content = '';
	_images = []; // Array to hold image info objects
	_darkMode = null; // 다크 모드 상태, null은 자동 감지
	_colorSchemeObserver = null; // 색상 스키마 변경 감지를 위한 MutationObserver
	_imageUploadEndpoint = null; // 이미지 업로드 API 엔드포인트
	_maxHeight = 600; // 에디터 최대 높이 (기본 600px)
	_minHeight = 400; // 최소 높이 추가
	_toolbarOptions = {}; // 툴바 옵션 객체 추가
	_fontFamilies = []; // 폰트 패밀리 목록 추가

	static get observedAttributes() {
		return [
			'content',
			'images',
			'dark-mode',
			'image-upload-endpoint',
			'max-height',
			'min-height', // 최소 높이 속성 추가
			'toolbar-options', // 툴바 옵션 속성 추가
			'font-families', // 폰트 패밀리 목록 속성 추가
		];
	}

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		const currentHostname = window.location.hostname;

		// 현재 호스트 이름이 허용 목록에 있는지 확인
		if (!ALLOWED_HOSTNAMES.includes(currentHostname)) {
			console.error(
				`[KirsiEditorElement] 이 컴포넌트는 다음 도메인에서 실행할 수 없습니다: ${currentHostname}. 허용된 도메인: ${ALLOWED_HOSTNAMES.join(
					', '
				)}`
			);
			// (선택 사항) 사용자에게 표시할 메시지
			this.shadowRoot.innerHTML = `<p style="color: red; font-family: sans-serif;">KirsiEditor는 이 도메인에서 사용할 수 없습니다.</p>`;
			return; // 초기화 중단
		}

		console.log(
			`[KirsiEditorElement] 현재 도메인(${currentHostname})에서 실행이 허용되었습니다.`
		);

		if (!this.shadowRoot) {
			console.error(
				'[KirsiEditorElement] Shadow root not available.'
			);
			return;
		}

		// --- Highlight.js 스타일 주입 ---
		try {
			const style = document.createElement('style');
			style.textContent = hljsStyle; // 변경된 변수 사용
			this.shadowRoot.appendChild(style);
			console.log(
				'[KirsiEditorElement] Injected highlight.js dark theme style into Shadow DOM.'
			);
		} catch (error) {
			console.error(
				'[KirsiEditorElement] Failed to inject highlight.js style:',
				error
			);
		}

		// --- 다크 모드 상태 초기 설정 ---
		this._initDarkModeState();

		// --- 이미지 업로드 엔드포인트 초기 설정 ---
		this._initImageUploadEndpoint();

		// --- 최대 높이 초기 설정 ---
		this._initMaxHeight();

		// --- 최소 높이 초기 설정 ---
		this._initMinHeight();

		// --- 툴바 옵션 초기 설정 ---
		this._initToolbarOptions();

		// --- 폰트 패밀리 초기 설정 ---
		this._initFontFamilies();

		try {
			// Svelte 5: mount 함수 사용
			const mountedComponent = mount(KirsiEditor, {
				target: this.shadowRoot,
				props: {
					initialContent: this._content,
					initialImages: this._images,
					hostElement: this, // 웹 컴포넌트 인스턴스를 prop으로 전달
					darkMode: this._darkMode, // 다크 모드 상태 전달
					imageUploadEndpoint:
						this._imageUploadEndpoint, // 이미지 업로드 엔드포인트 전달
					maxHeight: this._maxHeight, // 최대 높이 전달
					minHeight: this._minHeight, // 최소 높이 전달
					toolbarOptions: this._toolbarOptions, // 툴바 옵션 전달
					fontFamilies: this._fontFamilies, // 폰트 패밀리 전달
				},
			});

			console.log(
				'[KirsiEditorElement] Component mounted, returned object:',
				mountedComponent
			);

			// 검사 조건 변경: mountedComponent 객체 자체를 인스턴스로 간주
			if (!mountedComponent) {
				console.error(
					'[KirsiEditorElement] Failed to mount Svelte component: mount() returned invalid object.'
				);
				return;
			}
			// unmount 함수 존재 여부 확인 (반환된 객체 자체에 있을 수 있음)
			if (typeof mountedComponent.unmount !== 'function') {
				console.warn(
					'[KirsiEditorElement] Warning: unmount function not found on mounted component.'
				);
			}

			this._editorInstance = mountedComponent; // 객체 자체를 인스턴스로 할당
			// unmount 함수 할당
			this._unmount =
				typeof mountedComponent.unmount === 'function'
					? mountedComponent.unmount
					: () => {};

			// --- 메서드 노출 ---
			// 인스턴스의 exported 함수에 접근 (Svelte 5에서는 instance.prop 대신 instance.함수명 형태)
			this.setContent = (newContent) => {
				// instance 객체에 setContent 함수가 있는지 확인
				if (
					this._editorInstance &&
					typeof this._editorInstance
						.setContent === 'function'
				) {
					this._editorInstance.setContent(
						newContent
					);
				} else {
					console.warn(
						'[KirsiEditorElement] setContent method not found on Svelte instance.'
					);
				}
			};

			this.getContent = () => {
				if (
					this._editorInstance &&
					typeof this._editorInstance
						.getContent === 'function'
				) {
					return this._editorInstance.getContent();
				} else {
					console.warn(
						'[KirsiEditorElement] getContent method not found on Svelte instance.'
					);
				}
				return this._content;
			};

			this.getImages = () => {
				if (
					this._editorInstance &&
					typeof this._editorInstance
						.getImages === 'function'
				) {
					return this._editorInstance.getImages();
				} else {
					console.warn(
						'[KirsiEditorElement] getImages method not found on Svelte instance.'
					);
				}
				return this._images;
			};

			this.setImages = (newImages) => {
				if (
					this._editorInstance &&
					typeof this._editorInstance
						.setImages === 'function'
				) {
					this._editorInstance.setImages(
						newImages
					);
				} else {
					console.warn(
						'[KirsiEditorElement] setImages method not found on Svelte instance.'
					);
				}
			};

			// 다크 모드 관련 API 추가
			this.setDarkMode = (darkModeEnabled) => {
				this._darkMode = !!darkModeEnabled;
				if (
					this._editorInstance &&
					typeof this._editorInstance
						.setDarkMode === 'function'
				) {
					this._editorInstance.setDarkMode(
						this._darkMode
					);
				} else {
					console.warn(
						'[KirsiEditorElement] setDarkMode method not found on Svelte instance.'
					);
				}
				// 속성도 업데이트
				this.setAttribute(
					'dark-mode',
					this._darkMode ? 'true' : 'false'
				);
			};

			this.isDarkMode = () => {
				if (
					this._editorInstance &&
					typeof this._editorInstance
						.isDarkMode === 'function'
				) {
					return this._editorInstance.isDarkMode();
				}
				return this._darkMode;
			};

			this.useAutoDarkMode = () => {
				this._darkMode = null; // null로 설정하여 자동 감지 모드로 전환
				// 속성 제거
				this.removeAttribute('dark-mode');
				// 다시 자동 감지 로직 실행
				this._detectAndApplyDarkMode();
			};

			// 이미지 업로드 엔드포인트 관련 API 추가
			this.setImageUploadEndpoint = (endpoint) => {
				this._imageUploadEndpoint = endpoint;
				if (
					this._editorInstance &&
					typeof this._editorInstance
						.setImageUploadEndpoint ===
						'function'
				) {
					this._editorInstance.setImageUploadEndpoint(
						endpoint
					);
				} else {
					console.warn(
						'[KirsiEditorElement] setImageUploadEndpoint method not found on Svelte instance.'
					);
				}
				// 속성도 업데이트
				if (endpoint) {
					this.setAttribute(
						'image-upload-endpoint',
						endpoint
					);
				} else {
					this.removeAttribute(
						'image-upload-endpoint'
					);
				}
			};

			this.getImageUploadEndpoint = () => {
				if (
					this._editorInstance &&
					typeof this._editorInstance
						.getImageUploadEndpoint ===
						'function'
				) {
					return this._editorInstance.getImageUploadEndpoint();
				}
				return this._imageUploadEndpoint;
			};

			// 최대 높이 설정 메소드 추가
			this.setMaxHeight = (height) => {
				this._maxHeight = height;
				// KirsiEditor 컴포넌트에 maxHeight prop이 있다면 업데이트
				if (
					this._editorInstance &&
					typeof this._editorInstance.$set ===
						'function'
				) {
					this._editorInstance.$set({
						maxHeight: height,
					});
				} else {
					console.warn(
						'[KirsiEditorElement] Could not set maxHeight on Svelte instance'
					);
				}
				// 속성 업데이트
				this.setAttribute(
					'max-height',
					height.toString()
				);
			};

			this.getMaxHeight = () => {
				return this._maxHeight;
			};

			// 최소 높이 설정 메서드 추가 (외부 API용)
			this.setMinHeight = (height) => {
				this._minHeight = height;

				this.setAttribute('min-height', height);

				if (
					this._editorInstance &&
					typeof this._editorInstance
						.setMinHeight === 'function'
				) {
					this._editorInstance.setMinHeight(
						height
					);
				}
			};

			// 현재 최소 높이 반환 메서드 추가 (외부 API용)
			this.getMinHeight = () => {
				return this._minHeight;
			};

			// 툴바 옵션 설정 메서드 추가
			this.setToolbarOptions = (options) => {
				this._toolbarOptions = options || {};
				
				// 에디터 인스턴스에 툴바 옵션 업데이트
				if (
					this._editorInstance &&
					typeof this._editorInstance.setToolbarOptions === 'function'
				) {
					this._editorInstance.setToolbarOptions(this._toolbarOptions);
				} else {
					console.warn(
						'[KirsiEditorElement] setToolbarOptions method not found on Svelte instance.'
					);
				}
				
				// 속성 업데이트
				this.setAttribute(
					'toolbar-options',
					JSON.stringify(this._toolbarOptions)
				);
			};
			
			// 툴바 옵션 가져오기 메서드 추가
			this.getToolbarOptions = () => {
				return this._toolbarOptions;
			};

			// 폰트 패밀리 설정 메서드 추가
			this.setFontFamilies = (families) => {
				this._fontFamilies = families || [];
				
				// 에디터 인스턴스에 폰트 패밀리 업데이트
				if (
					this._editorInstance &&
					typeof this._editorInstance.setFontFamilies === 'function'
				) {
					this._editorInstance.setFontFamilies(this._fontFamilies);
				} else {
					console.warn(
						'[KirsiEditorElement] setFontFamilies method not found on Svelte instance.'
					);
				}
				
				// 속성 업데이트
				this.setAttribute(
					'font-families',
					JSON.stringify(this._fontFamilies)
				);
			};
			
			// 폰트 패밀리 가져오기 메서드 추가
			this.getFontFamilies = () => {
				return this._fontFamilies;
			};

			console.log(
				'[KirsiEditorElement] Methods exposed (attempted).'
			);

			// 시스템 다크 모드 변경 감지 설정
			this._setupColorSchemeChangeListener();

			// 부모 문서의 다크 모드 클래스 변경 감지 설정
			this._setupDarkModeClassObserver();
		} catch (error) {
			console.error(
				'[KirsiEditorElement] Error during connectedCallback (mount):',
				error
			);
		}
	}

	disconnectedCallback() {
		console.log('[KirsiEditorElement] Disconnecting...');
		// Svelte 5: unmount 함수 호출
		if (this._unmount) {
			try {
				this._unmount();
				console.log(
					'[KirsiEditorElement] Component unmounted.'
				);
			} catch (error) {
				console.error(
					'[KirsiEditorElement] Error during unmount:',
					error
				);
			}
			this._unmount = null;
			this._editorInstance = null;
		}

		// 다크 모드 감지 관련 정리
		this._cleanupColorSchemeListener();
		this._cleanupDarkModeClassObserver();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		console.log(`[KirsiEditorElement] Attribute changed: ${name}`, {
			oldValue,
			newValue,
		});
		// Ensure methods are available before calling them
		if (name === 'content' && oldValue !== newValue) {
			this._content = newValue ?? '';
			// 컴포넌트가 마운트된 후에만 속성 변경 적용 & 메서드 존재 확인
			if (
				this._editorInstance &&
				typeof this.setContent === 'function'
			) {
				this.setContent(this._content);
			}
		}
		if (name === 'images' && oldValue !== newValue) {
			try {
				const parsedImages = JSON.parse(
					newValue || '[]'
				);
				this._images = Array.isArray(parsedImages)
					? parsedImages
					: [];
				// 컴포넌트가 마운트된 후에만 속성 변경 적용 & 메서드 존재 확인
				if (
					this._editorInstance &&
					typeof this.setImages === 'function'
				) {
					this.setImages(this._images);
				}
			} catch (e) {
				console.error(
					'[KirsiEditorElement] Failed to parse images attribute:',
					e
				);
				this._images = [];
				if (
					this._editorInstance &&
					typeof this.setImages === 'function'
				) {
					this.setImages(this._images); // Reset images on error
				}
			}
		}
		// 다크 모드 속성 변경 처리
		if (name === 'dark-mode' && oldValue !== newValue) {
			if (newValue === null || newValue === undefined) {
				// 속성이 제거되면 자동 감지 모드로
				this._darkMode = null;
				this._detectAndApplyDarkMode();
			} else {
				// true/false 문자열 처리
				const isDark =
					newValue === 'true' || newValue === ''; // 빈 값은 true로 처리
				this._darkMode = isDark;
				if (
					this._editorInstance &&
					typeof this._editorInstance
						.setDarkMode === 'function'
				) {
					this._editorInstance.setDarkMode(
						isDark
					);
				}
			}
		}
		// 이미지 업로드 엔드포인트 속성 변경 처리
		if (name === 'image-upload-endpoint' && oldValue !== newValue) {
			this._imageUploadEndpoint = newValue || null;
			if (
				this._editorInstance &&
				typeof this._editorInstance
					.setImageUploadEndpoint === 'function'
			) {
				this._editorInstance.setImageUploadEndpoint(
					this._imageUploadEndpoint
				);
			}
		}
		// 최대 높이 속성 변경 처리
		if (name === 'max-height' && oldValue !== newValue) {
			// 숫자 또는 유효한 CSS 단위 값 처리
			this._parseAndSetMaxHeight(newValue);

			// Svelte 컴포넌트에 업데이트
			if (
				this._editorInstance &&
				typeof this._editorInstance.$set === 'function'
			) {
				this._editorInstance.$set({
					maxHeight: this._maxHeight,
				});
			}
		}
		// 최소 높이 속성 변경 처리
		if (name === 'min-height' && oldValue !== newValue) {
			this._parseAndSetMinHeight(newValue);

			// 에디터 인스턴스의 setMinHeight 메서드 호출
			if (
				this._editorInstance &&
				typeof this._editorInstance.setMinHeight ===
					'function'
			) {
				this._editorInstance.setMinHeight(
					this._minHeight
				);
			}
		}
		// 툴바 옵션 속성 변경 처리
		if (name === 'toolbar-options' && oldValue !== newValue) {
			try {
				const parsedOptions = JSON.parse(newValue || '{}');
				this._toolbarOptions = typeof parsedOptions === 'object' ? parsedOptions : {};
				
				// 에디터 인스턴스 업데이트
				if (
					this._editorInstance &&
					typeof this._editorInstance.setToolbarOptions === 'function'
				) {
					this._editorInstance.setToolbarOptions(this._toolbarOptions);
				}
			} catch (e) {
				console.error(
					'[KirsiEditorElement] Failed to parse toolbar-options attribute:',
					e
				);
				this._toolbarOptions = {}; // 오류 발생 시 기본값으로 초기화
				
				// 오류 발생 시 에디터 인스턴스 업데이트
				if (
					this._editorInstance &&
					typeof this._editorInstance.setToolbarOptions === 'function'
				) {
					this._editorInstance.setToolbarOptions(this._toolbarOptions);
				}
			}
		}
		// 폰트 패밀리 속성 변경 처리
		if (name === 'font-families' && oldValue !== newValue) {
			try {
				const parsedFamilies = JSON.parse(newValue || '[]');
				this._fontFamilies = Array.isArray(parsedFamilies) ? parsedFamilies : [];
				
				// 에디터 인스턴스 업데이트
				if (
					this._editorInstance &&
					typeof this._editorInstance.setFontFamilies === 'function'
				) {
					this._editorInstance.setFontFamilies(this._fontFamilies);
				}
			} catch (e) {
				console.error(
					'[KirsiEditorElement] Failed to parse font-families attribute:',
					e
				);
				this._fontFamilies = []; // 오류 발생 시 기본값으로 초기화
				
				// 오류 발생 시 에디터 인스턴스 업데이트
				if (
					this._editorInstance &&
					typeof this._editorInstance.setFontFamilies === 'function'
				) {
					this._editorInstance.setFontFamilies(this._fontFamilies);
				}
			}
		}
	}

	// 다크 모드 관련 초기화 메소드
	_initDarkModeState() {
		// 속성에서 초기값 가져오기
		const darkModeAttr = this.getAttribute('dark-mode');
		if (darkModeAttr === null || darkModeAttr === undefined) {
			this._darkMode = null; // 자동 감지
			this._detectAndApplyDarkMode();
		} else {
			// 속성값 파싱
			const isDark =
				darkModeAttr === 'true' || darkModeAttr === '';
			this._darkMode = isDark;
		}
		console.log(
			`[KirsiEditorElement] Dark mode initialized: ${
				this._darkMode === null
					? 'auto'
					: this._darkMode
			}`
		);
	}

	// 이미지 업로드 엔드포인트 초기화 메소드
	_initImageUploadEndpoint() {
		// 속성에서 초기값 가져오기
		const endpoint = this.getAttribute('image-upload-endpoint');
		this._imageUploadEndpoint = endpoint || null;
		console.log(
			`[KirsiEditorElement] Image upload endpoint initialized: ${
				this._imageUploadEndpoint || 'not set'
			}`
		);
	}

	// 최대 높이 초기화 메소드
	_initMaxHeight() {
		// 속성에서 초기값 가져오기
		const maxHeightAttr = this.getAttribute('max-height');
		if (maxHeightAttr !== null) {
			this._parseAndSetMaxHeight(maxHeightAttr);
		}
		console.log(
			`[KirsiEditorElement] Max height initialized: ${this._maxHeight}`
		);
	}

	// 최소 높이 초기화 메서드 추가
	_initMinHeight() {
		const minHeightAttr = this.getAttribute('min-height');

		if (minHeightAttr) {
			this._parseAndSetMinHeight(minHeightAttr);
		}

		console.log(
			`[KirsiEditorElement] 최소 높이 초기화: ${this._minHeight}px`
		);
	}
	
	// 툴바 옵션 초기화 메서드 추가
	_initToolbarOptions() {
		const toolbarOptionsAttr = this.getAttribute('toolbar-options');
		
		if (toolbarOptionsAttr) {
			try {
				const parsedOptions = JSON.parse(toolbarOptionsAttr);
				this._toolbarOptions = typeof parsedOptions === 'object' ? parsedOptions : {};
			} catch (e) {
				console.error(
					'[KirsiEditorElement] Failed to parse toolbar-options attribute:',
					e
				);
				this._toolbarOptions = {}; // 오류 발생 시 기본값으로 초기화
			}
		} else {
			// 기본값: 빈 객체 (모든 옵션 표시)
			this._toolbarOptions = {};
		}
		
		console.log(
			`[KirsiEditorElement] 툴바 옵션 초기화:`,
			this._toolbarOptions
		);
	}

	// 폰트 패밀리 초기화 메서드 추가
	_initFontFamilies() {
		const fontFamiliesAttr = this.getAttribute('font-families');
		
		if (fontFamiliesAttr) {
			try {
				const parsedFamilies = JSON.parse(fontFamiliesAttr);
				this._fontFamilies = Array.isArray(parsedFamilies) ? parsedFamilies : [];
			} catch (e) {
				console.error(
					'[KirsiEditorElement] Failed to parse font-families attribute:',
					e
				);
				this._fontFamilies = []; // 오류 발생 시 기본값으로 초기화
			}
		} else {
			// 기본값: 빈 배열 (기본 폰트 목록 사용)
			this._fontFamilies = [];
		}
		
		console.log(
			`[KirsiEditorElement] 폰트 패밀리 초기화:`,
			this._fontFamilies
		);
	}

	// 최대 높이 값 파싱 및 설정
	_parseAndSetMaxHeight(value) {
		if (value === null || value === undefined || value === '') {
			this._maxHeight = 600; // 기본값
			return;
		}

		// 숫자 변환 시도
		const numValue = Number(value);
		if (!isNaN(numValue)) {
			this._maxHeight = numValue;
			return;
		}

		// CSS 값(예: '500px', '50vh' 등)은 그대로 사용
		this._maxHeight = value;
	}

	// 최소 높이 파싱 및 설정 메서드 추가
	_parseAndSetMinHeight(value) {
		if (!value) {
			this._minHeight = 400; // 기본값
			return;
		}

		try {
			// 숫자만 있는 경우 (예: "300")
			if (/^\d+$/.test(value)) {
				this._minHeight = parseInt(value, 10);
			}
			// 단위가 있는 경우 (예: "300px")
			else if (
				typeof value === 'string' &&
				value.endsWith('px')
			) {
				this._minHeight = parseInt(
					value.slice(0, -2),
					10
				);
			}
			// 그 외의 경우 기본값 사용
			else {
				this._minHeight = 400;
			}
		} catch (error) {
			console.error(
				'[KirsiEditorElement] 최소 높이 파싱 오류:',
				error
			);
			this._minHeight = 400;
		}
	}

	// 다크 모드 상태 자동 감지 및 적용
	_detectAndApplyDarkMode() {
		if (this._darkMode !== null) {
			return; // 명시적으로 설정된 경우 자동 감지 안 함
		}

		// 1. CSS 변수나 클래스로 감지
		const documentHasDarkClass =
			document.documentElement.classList.contains('dark') ||
			document.documentElement.classList.contains(
				'theme-dark'
			) ||
			document.documentElement.classList.contains(
				'darkmode'
			) ||
			document.body.classList.contains('dark') ||
			document.body.classList.contains('theme-dark') ||
			document.body.classList.contains('darkmode');

		// CSS 변수 확인
		const computedStyle = window.getComputedStyle(
			document.documentElement
		);
		const themeVar =
			computedStyle.getPropertyValue('--theme') ||
			computedStyle.getPropertyValue('--color-scheme') ||
			computedStyle.getPropertyValue('--mode');
		const hasThemeVar = themeVar?.includes('dark');

		// 2. 미디어 쿼리로 시스템 다크 모드 감지
		const prefersDarkScheme = window.matchMedia(
			'(prefers-color-scheme: dark)'
		).matches;

		// 최종 다크 모드 결정 (우선순위: 문서 클래스/변수 > 시스템 설정)
		const isDark =
			documentHasDarkClass ||
			hasThemeVar ||
			prefersDarkScheme;

		console.log(`[KirsiEditorElement] Auto detected dark mode:`, {
			documentHasDarkClass,
			hasThemeVar,
			prefersDarkScheme,
			finalDecision: isDark,
		});

		// Svelte 컴포넌트에 적용
		if (
			this._editorInstance &&
			typeof this._editorInstance.setDarkMode === 'function'
		) {
			this._editorInstance.setDarkMode(isDark);
		}
	}

	// 시스템 색상 스키마 변경 감지 리스너 설정
	_setupColorSchemeChangeListener() {
		this._colorSchemeMediaQuery = window.matchMedia(
			'(prefers-color-scheme: dark)'
		);

		// 변경 감지 함수
		this._handleColorSchemeChange = (e) => {
			console.log(
				`[KirsiEditorElement] System color scheme changed: ${
					e.matches ? 'dark' : 'light'
				}`
			);
			if (this._darkMode === null) {
				// 자동 모드일 때만 반응
				this._detectAndApplyDarkMode();
			}
		};

		// 호환성을 위한 리스너 등록
		if (this._colorSchemeMediaQuery.addEventListener) {
			this._colorSchemeMediaQuery.addEventListener(
				'change',
				this._handleColorSchemeChange
			);
		} else if (this._colorSchemeMediaQuery.addListener) {
			// Safari/iOS 13 이하
			this._colorSchemeMediaQuery.addListener(
				this._handleColorSchemeChange
			);
		}
	}

	// 시스템 색상 스키마 리스너 정리
	_cleanupColorSchemeListener() {
		if (
			!this._colorSchemeMediaQuery ||
			!this._handleColorSchemeChange
		)
			return;

		if (this._colorSchemeMediaQuery.removeEventListener) {
			this._colorSchemeMediaQuery.removeEventListener(
				'change',
				this._handleColorSchemeChange
			);
		} else if (this._colorSchemeMediaQuery.removeListener) {
			this._colorSchemeMediaQuery.removeListener(
				this._handleColorSchemeChange
			);
		}

		this._colorSchemeMediaQuery = null;
		this._handleColorSchemeChange = null;
	}

	// 부모 문서의 다크 모드 클래스 변경 감지 설정
	_setupDarkModeClassObserver() {
		// body와 html의 클래스 변경을 관찰
		const callback = (mutationsList) => {
			for (const mutation of mutationsList) {
				if (
					mutation.type === 'attributes' &&
					mutation.attributeName === 'class'
				) {
					console.log(
						'[KirsiEditorElement] Document class changed, rechecking dark mode'
					);
					if (this._darkMode === null) {
						// 자동 모드일 때만
						this._detectAndApplyDarkMode();
					}
				}
			}
		};

		this._darkModeObserver = new MutationObserver(callback);

		// HTML 및 BODY 요소 모두 감시
		this._darkModeObserver.observe(document.documentElement, {
			attributes: true,
		});
		this._darkModeObserver.observe(document.body, {
			attributes: true,
		});
	}

	// 다크 모드 클래스 옵저버 정리
	_cleanupDarkModeClassObserver() {
		if (this._darkModeObserver) {
			this._darkModeObserver.disconnect();
			this._darkModeObserver = null;
		}
	}

	// Define properties for methods to allow access from outside
	// These will be assigned in connectedCallback
	setContent = (newContent) => {
		console.warn('setContent called before initialization');
	};
	getContent = () => {
		console.warn('getContent called before initialization');
		return this._content;
	};
	getImages = () => {
		console.warn('getImages called before initialization');
		return this._images;
	};
	setImages = (newImages) => {
		console.warn('setImages called before initialization');
	};
	setDarkMode = (darkModeEnabled) => {
		console.warn('setDarkMode called before initialization');
	};
	isDarkMode = () => {
		console.warn('isDarkMode called before initialization');
		return this._darkMode === null
			? this._detectAndReturnDarkMode()
			: this._darkMode;
	};
	useAutoDarkMode = () => {
		console.warn('useAutoDarkMode called before initialization');
	};

	// 이미지 업로드 관련 메서드 기본 구현
	setImageUploadEndpoint = (endpoint) => {
		console.warn(
			'setImageUploadEndpoint called before initialization'
		);
	};
	getImageUploadEndpoint = () => {
		console.warn(
			'getImageUploadEndpoint called before initialization'
		);
		return this._imageUploadEndpoint;
	};

	// 최대 높이 관련 메서드 기본 구현
	setMaxHeight = (height) => {
		console.warn('setMaxHeight called before initialization');
	};
	getMaxHeight = () => {
		console.warn('getMaxHeight called before initialization');
		return this._maxHeight;
	};

	// 최소 높이 설정 메서드 기본 구현
	setMinHeight = (height) => {
		console.warn('setMinHeight called before initialization');
	};
	getMinHeight = () => {
		console.warn('getMinHeight called before initialization');
		return this._minHeight;
	};
	
	// 툴바 옵션 관련 메서드 기본 구현
	setToolbarOptions = (options) => {
		console.warn('setToolbarOptions called before initialization');
	};
	getToolbarOptions = () => {
		console.warn('getToolbarOptions called before initialization');
		return this._toolbarOptions;
	};

	// 폰트 패밀리 관련 메서드 기본 구현
	setFontFamilies = (families) => {
		console.warn('setFontFamilies called before initialization');
	};
	getFontFamilies = () => {
		console.warn('getFontFamilies called before initialization');
		return this._fontFamilies;
	};

	// 다크 모드 상태만 감지해서 반환 (초기화 전 호출용)
	_detectAndReturnDarkMode() {
		const prefersDarkScheme = window.matchMedia(
			'(prefers-color-scheme: dark)'
		).matches;
		const documentHasDarkClass =
			document.documentElement.classList.contains('dark') ||
			document.documentElement.classList.contains(
				'theme-dark'
			) ||
			document.body.classList.contains('dark') ||
			document.body.classList.contains('theme-dark');
		return documentHasDarkClass || prefersDarkScheme;
	}
}

// Define the custom element
if (typeof window !== 'undefined' && !customElements.get('kirsi-editor')) {
	customElements.define('kirsi-editor', KirsiEditorElement);
	console.log(
		'[KirsiEditorElement] Custom element <kirsi-editor> defined.'
	);
} else if (typeof window !== 'undefined') {
	console.log(
		'[KirsiEditorElement] Custom element <kirsi-editor> already defined.'
	);
}

export default KirsiEditorElement;
