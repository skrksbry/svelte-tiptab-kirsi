<script lang="ts">
	// 전역 스타일 import (하이라이트 테마 제거 - 웹 컴포넌트 내부에서 처리)
	// import 'highlight.js/styles/github.css'; 
	import '../app.css';
	
	let { children } = $props();
</script>

{@render children()}
