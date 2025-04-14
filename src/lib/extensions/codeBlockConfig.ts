import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { createLowlight } from 'lowlight' // lowlight 인스턴스 생성 함수
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

// 필요한 언어만 import
import typescript from 'highlight.js/lib/languages/typescript'
import javascript from 'highlight.js/lib/languages/javascript'
import html from 'highlight.js/lib/languages/xml' // HTML은 xml 사용
import css from 'highlight.js/lib/languages/css'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import plaintext from 'highlight.js/lib/languages/plaintext'

// lowlight 인스턴스 생성
const lowlight = createLowlight()

// 언어 등록
lowlight.register('typescript', typescript)
lowlight.register('javascript', javascript)
lowlight.register('html', html)
lowlight.register('css', css)
lowlight.register('python', python)
lowlight.register('java', java)
lowlight.register('cpp', cpp)
lowlight.register('csharp', csharp)
lowlight.register('text', plaintext)

// 지원하는 언어 목록
export const supportedLanguages = [
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
]

// 언어 선택기 플러그인
const codeBlockLanguageSelectPluginKey = new PluginKey('codeBlockLanguageSelect')

const codeBlockLanguageSelectPlugin = () => {
  return new Plugin({
    key: codeBlockLanguageSelectPluginKey,
    state: {
      init() {
        return { decorations: DecorationSet.empty, isEditing: false }
      },
      apply(tr, prev) {
        // 이 플러그인으로 트랜잭션이 발생하면 데코레이션 업데이트
        const meta = tr.getMeta(codeBlockLanguageSelectPluginKey)
        if (meta) {
          return meta
        }

        // 트랜잭션으로 문서가 변경됐다면 데코레이션 재계산
        if (tr.docChanged) {
          let decorations = DecorationSet.empty
          const codeBlocks: { pos: number, node: any }[] = []

          tr.doc.descendants((node, pos) => {
            if (node.type.name === 'codeBlock') {
              codeBlocks.push({ pos, node })
            }
            return true
          })

          // 각 코드 블록에 언어 선택기 추가
          codeBlocks.forEach(({ pos, node }) => {
            const selectButton = document.createElement('div')
            selectButton.className = 'code-language-select-button'
            
            // 현재 언어 표시
            const currentLanguage = node.attrs.language || 'auto'
            
            // 텍스트와 화살표 아이콘 추가
            const langText = document.createElement('span')
            langText.className = 'code-language-text'
            langText.textContent = currentLanguage === 'auto' ? 'Auto' : 
                                 supportedLanguages.find(lang => lang.value === currentLanguage)?.name || 
                                 currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1)
            
            const arrowIcon = document.createElement('span')
            arrowIcon.className = 'code-language-arrow'
            arrowIcon.innerHTML = '▾' // 간단한 화살표 아이콘
            
            selectButton.appendChild(langText)
            selectButton.appendChild(arrowIcon)
            
            // 버튼에 데이터 속성 추가
            selectButton.dataset.pos = String(pos)
            selectButton.dataset.language = currentLanguage

            // 언어 선택기를 코드 블록의 오른쪽 상단에 배치
            const deco = Decoration.widget(pos + 1, selectButton, {
              stopEvent: () => true, // 이벤트 전파 중단
            })
            decorations = decorations.add(tr.doc, [deco])
          })

          return { decorations, isEditing: prev.isEditing }
        }

        return { 
          decorations: prev.decorations.map(tr.mapping, tr.doc),
          isEditing: prev.isEditing 
        }
      }
    },
    props: {
      decorations(state) {
        return this.getState(state).decorations
      },
      // 클릭 이벤트 처리
      handleDOMEvents: {
        click(view, event) {
          const target = event.target as HTMLElement
          
          // 언어 선택 버튼이나 자식 요소 클릭
          const button = target.closest('.code-language-select-button')
          if (button) {
            event.preventDefault()
            event.stopPropagation()
            
            // 이미 열려있는 메뉴 확인 - 같은 버튼 클릭 시 닫기 위한 처리
            const existingMenu = document.querySelector('.code-language-select-menu') as HTMLElement;
            const isClickingSameButton = existingMenu && 
                existingMenu.dataset.buttonPos === button.dataset.pos;
            
            // 모든 언어 선택 메뉴 닫기
            document.querySelectorAll('.code-language-select-menu').forEach(menu => {
              menu.remove()
            })
            
            // 같은 버튼을 클릭한 경우 메뉴를 닫고 종료
            if (isClickingSameButton) {
              return true;
            }
            
            // 언어 선택 메뉴 생성
            const pos = parseInt(button.dataset.pos || '0')
            const languageMenu = document.createElement('div')
            languageMenu.className = 'code-language-select-menu'
            // 열린 메뉴와 버튼 연결을 위해 데이터 속성 추가
            languageMenu.dataset.buttonPos = button.dataset.pos
            
            // 코드 블록 요소 찾기
            const codeBlockEl = view.nodeDOM(pos) as HTMLElement
            if (codeBlockEl) {
              // 메뉴가 코드 블록 높이와 관계없이 상위에 표시되도록 설정
              document.body.appendChild(languageMenu)
              
              // 버튼 위치 계산해서 메뉴 위치 설정
              const buttonRect = button.getBoundingClientRect()
              languageMenu.style.position = 'fixed'
              languageMenu.style.top = `${buttonRect.bottom}px`
              languageMenu.style.left = `${buttonRect.left}px`
              languageMenu.style.zIndex = '1000'
              
              // 박스 스타일 추가
              languageMenu.style.backgroundColor = 'white'
              languageMenu.style.border = '1px solid #ddd'
              languageMenu.style.borderRadius = '4px'
              languageMenu.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)'
              languageMenu.style.overflow = 'hidden'
            }
            
            // 선택 가능한 언어 목록
            supportedLanguages.forEach(lang => {
              const langOption = document.createElement('div')
              langOption.className = 'code-language-option'
              langOption.textContent = lang.name
              
              // 현재 선택된 언어일 경우 표시
              if (button.dataset.language === (lang.value || 'auto')) {
                langOption.classList.add('selected')
              }
              
              // 언어 옵션 스타일 설정
              langOption.style.padding = '8px 16px'
              langOption.style.cursor = 'pointer'
              langOption.style.fontSize = getComputedStyle(button).fontSize // 버튼과 동일한 폰트 사이즈
              langOption.style.lineHeight = '1.5'
              
              // 호버 효과
              langOption.addEventListener('mouseover', () => {
                langOption.style.backgroundColor = '#f5f5f5'
              })
              langOption.addEventListener('mouseout', () => {
                langOption.style.backgroundColor = ''
              })
              
              // 언어 옵션 클릭 이벤트
              langOption.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                
                // 에디터 커맨드로 언어 변경
                const nodePos = view.state.doc.resolve(pos)
                const nodeStart = nodePos.start()
                const nodeEnd = nodePos.end()
                
                // 트랜잭션 생성
                const tr = view.state.tr.setNodeMarkup(pos, undefined, {
                  ...view.state.doc.nodeAt(pos)?.attrs,
                  language: lang.value || null
                })
                
                view.dispatch(tr)
                
                // 메뉴 닫기
                languageMenu.remove()
              })
              
              languageMenu.appendChild(langOption)
            })
            
            // 문서 클릭시 메뉴 닫기 이벤트 
            const closeMenu = (e: MouseEvent) => {
              const clickTarget = e.target as HTMLElement
              if (!languageMenu.contains(clickTarget) && clickTarget !== button && !button.contains(clickTarget)) {
                languageMenu.remove()
                document.removeEventListener('click', closeMenu)
              }
            }
            
            // 이벤트 등록 (setTimeout으로 현재 클릭 이벤트와 충돌 방지)
            setTimeout(() => {
              document.addEventListener('click', closeMenu)
            }, 0)
            
            return true
          }
          
          // 언어 옵션 메뉴 외 영역 클릭시 메뉴 닫기
          const isClickOutside = !event.composedPath().some(
            (el) => (el as HTMLElement).classList?.contains('code-language-select-menu')
          )
          
          if (isClickOutside) {
            document.querySelectorAll('.code-language-select-menu').forEach(menu => {
              menu.remove()
            })
          }
          
          return false
        },
      },
    },
  })
}

// CodeBlockLowlight 확장 설정 및 내보내기
export const CustomCodeBlock = CodeBlockLowlight.configure({
  lowlight,
  defaultLanguage: 'typescript',
  // HTMLAttributes를 사용하여 pre 태그에 클래스 추가
  HTMLAttributes: {
    // hljs 클래스와 language-`언어명` 클래스를 추가
    // Tiptap이 code 태그에 language-* 를 추가하므로, pre에도 추가해줌
    // 테마 CSS가 pre.hljs 또는 pre.language-* 선택자를 사용할 수 있음
    class: 'hljs code-block-with-language', // 기본 hljs 클래스 추가
  },
}).extend({
  addProseMirrorPlugins() {
    return [
      ...this.parent?.() || [],
      codeBlockLanguageSelectPlugin(),
    ]
  },
})