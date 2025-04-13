import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { createLowlight } from 'lowlight' // lowlight 인스턴스 생성 함수

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

// CodeBlockLowlight 확장 설정 및 내보내기
export const CustomCodeBlock = CodeBlockLowlight.configure({
  lowlight,
  defaultLanguage: 'typescript',
  // HTMLAttributes를 사용하여 pre 태그에 클래스 추가
  HTMLAttributes: {
    // hljs 클래스와 language-`언어명` 클래스를 추가
    // Tiptap이 code 태그에 language-* 를 추가하므로, pre에도 추가해줌
    // 테마 CSS가 pre.hljs 또는 pre.language-* 선택자를 사용할 수 있음
    class: 'hljs', // 기본 hljs 클래스 추가
  },
}); 