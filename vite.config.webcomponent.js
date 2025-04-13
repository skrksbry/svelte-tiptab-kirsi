// vite.config.webcomponent.js
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
    plugins: [
        svelte({
            compilerOptions: {
                // 웹 컴포넌트 모드로 컴파일
                customElement: true,
            },
        }),
    ],
    build: {
        // 라이브러리 모드 설정
        lib: {
            // 웹 컴포넌트의 진입점
            entry: path.resolve(__dirname, 'src/lib/web-component.js'),
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
        }
    },
});
