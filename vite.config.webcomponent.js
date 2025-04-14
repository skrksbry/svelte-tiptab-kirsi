// vite.config.webcomponent.js
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: {
				// 웹 컴포넌트 모드로 컴파일
				customElement: true,
			},
		}),
		obfuscatorPlugin({
			// javascript-obfuscator 옵션 설정
			// 자세한 옵션: https://github.com/javascript-obfuscator/javascript-obfuscator
			options: {
				// 예시 옵션 (필요에 따라 조정)
				compact: true, // 코드를 한 줄로 압축
				controlFlowFlattening: false, // 제어 흐름 평탄화 (성능 영향 가능)
				controlFlowFlatteningThreshold: 0.75,
				deadCodeInjection: true, // 무작위 더미 코드 삽입
				deadCodeInjectionThreshold: 0.2,
				debugProtection: true, // 디버거 실행 방지 (개발 중에는 false 권장)
				debugProtectionInterval: 1000,
				disableConsoleOutput: true, // console.* 함수 비활성화 (배포 시 true 고려)
				identifierNamesGenerator: 'hexadecimal', // 식별자 이름 생성 방식 ('hexadecimal', 'mangled')
				log: false,
				numbersToExpressions: true, // 숫자를 표현식으로 변경
				renameGlobals: false, // 전역 변수/함수 이름 변경 (주의 필요)
				selfDefending: true, // 코드를 수정하거나 포맷팅 시 작동 방해
				simplify: true,
				splitStrings: true, // 문자열 리터럴 분할
				splitStringsChunkLength: 10,
				stringArray: true, // 문자열을 배열로 추출하고 참조
				stringArrayEncoding: ['rc4'], // 문자열 배열 인코딩 ('none', 'base64', 'rc4')
				stringArrayIndexShift: true,
				stringArrayRotate: true,
				stringArrayShuffle: true,
				stringArrayWrappersCount: 2,
				stringArrayWrappersChainedCalls: true,
				stringArrayWrappersParametersMaxCount: 4,
				stringArrayWrappersType: 'function',
				stringArrayThreshold: 0.75,
				transformObjectKeys: true, // 객체 키 변환
				unicodeEscapeSequence: false, // 유니코드 이스케이프 시퀀스 사용
			},
			// 특정 파일 제외 (예: 라이브러리 파일)
			// exclude: ['**/node_modules/**'], // 기본적으로 node_modules는 제외될 수 있음
			// 특정 파일만 포함
			// include: ['**/src/lib/web-component.js']
		}),
	],
	build: {
		// 라이브러리 모드 설정
		lib: {
			// 웹 컴포넌트의 진입점
			entry: path.resolve(
				__dirname,
				'src/lib/web-component.js'
			),
			// 전역 변수로 사용할 이름 (iife 형식)
			name: 'KirsiEditor',
			// 출력 파일 이름
			fileName: (format) => `kirsi-editor.${format}.js`,
			// 출력 형식 (iife: 즉시 실행 함수, 브라우저에서 <script> 태그로 바로 로드 가능)
			formats: ['iife'],
		},
		// 웹 컴포넌트 빌드 결과물 출력 디렉토리
		outDir: 'dist-wc',
		// 빌드 시 출력 디렉토리 비우기
		emptyOutDir: true,
		rollupOptions: {
			// 필요에 따라 외부 라이브러리 처리 설정
			// output: {
			//   globals: {
			//     // 예: 전역 변수 매핑 (필요하다면)
			//   }
			// }
		},
	},
});
