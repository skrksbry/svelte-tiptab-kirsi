<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Trash2, BookImage } from 'lucide-svelte';

	interface ImageInfo {
		id: string;
		src: string;
		alt?: string;
		name: string;
		type: string;
		size: number;
		file?: File;
	}

	export let images: ImageInfo[] = [];
	export let isDarkMode = false;

	// 이미지 리스트 확장/축소 상태
	let isExpanded = false;

	// 미리보기 이미지 목록 선택
	let selectedImage: string | null = null;

	const dispatch = createEventDispatcher<{
		removeImage: { id: string };
		insertImage: { id: string; src: string; alt: string };
	}>();

	function handleRemoveImage(id: string) {
		dispatch('removeImage', { id });
	}

	function handleInsertImage(image: ImageInfo) {
		dispatch('insertImage', { id: image.id, src: image.src, alt: image.alt || image.name });
	}

	// 이미지 리스트 토글
	function toggleImageList() {
		isExpanded = !isExpanded;
	}

	// 숫자를 읽기 쉬운 형식으로 변환 (예: 1.5MB)
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
		else return (bytes / 1048576).toFixed(1) + ' MB';
	}
</script>

{#if images.length > 0}
	<div class="image-list-container {isDarkMode ? 'dark-mode' : 'light-mode'}">
		<div class="image-list-header" on:click={toggleImageList} role="button" tabindex="0">
			<div class="header-content">
				<BookImage size={16} />
				<span>이미지 리스트 ({images.length})</span>
			</div>
			<div class="toggle-indicator">{isExpanded ? '▼' : '◀'}</div>
		</div>

		{#if isExpanded}
			<div class="image-list">
				{#each images as image (image.id)}
					<div class="image-item" class:selected={selectedImage === image.id}>
						<div class="image-preview" on:click={() => handleInsertImage(image)} role="button" tabindex="0">
							<img src={image.src} alt={image.alt || image.name} />
						</div>
						<div class="image-info">
							<div class="image-name" title={image.name}>
								{image.name.length > 15 ? image.name.substring(0, 15) + '...' : image.name}
							</div>
							<div class="image-meta">
								<span>{formatFileSize(image.size)}</span>
							</div>
						</div>
						<div class="image-actions">
							<button on:click={() => handleRemoveImage(image.id)} class="remove-button" title="이미지 삭제">
								<Trash2 size={16} />
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.image-list-container {
		margin-bottom: 8px;
		border-radius: 4px;
		overflow: hidden;
	}

	/* 라이트 모드 스타일 */
	.light-mode {
		background-color: #f8f9fa;
		border: 1px solid #e0e0e0;
		color: #333;
	}

	/* 다크 모드 스타일 */
	.dark-mode {
		background-color: #2d2d2d;
		border: 1px solid #444;
		color: #e0e0e0;
	}

	.image-list-header {
		padding: 8px 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
		user-select: none;
		font-weight: 500;
		font-size: 14px;
	}

	/* 라이트/다크 모드 헤더 스타일 */
	.light-mode .image-list-header {
		background-color: #eaeaea;
	}

	.dark-mode .image-list-header {
		background-color: #383838;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.toggle-indicator {
		color: #888;
		transition: transform 0.3s ease;
	}

	.image-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 8px;
		padding: 12px;
		max-height: 200px;
		overflow-y: auto;
	}

	.image-item {
		border-radius: 4px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	/* 라이트/다크 모드 이미지 아이템 스타일 */
	.light-mode .image-item {
		background-color: white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e0e0e0;
	}

	.dark-mode .image-item {
		background-color: #333;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		border: 1px solid #555;
	}

	.image-preview {
		width: 100%;
		height: 80px;
		overflow: hidden;
		position: relative;
		cursor: pointer;
	}

	.image-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.3s ease;
	}

	.image-preview:hover img {
		transform: scale(1.1);
	}

	.image-info {
		padding: 6px 8px;
		flex-grow: 1;
	}

	.image-name {
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.image-meta {
		margin-top: 2px;
		font-size: 11px;
		color: #888;
	}

	/* 다크 모드 텍스트 색상 */
	.dark-mode .image-meta {
		color: #aaa;
	}

	.image-actions {
		position: absolute;
		top: 4px;
		right: 4px;
		opacity: 0;
		transition: opacity 0.2s ease;
		background-color: rgba(0, 0, 0, 0.5);
		border-radius: 4px;
	}

	.image-item:hover .image-actions {
		opacity: 1;
	}

	.remove-button {
		border: none;
		background: none;
		color: white;
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.remove-button:hover {
		background-color: rgba(255, 0, 0, 0.3);
	}

	/* 스크롤바 스타일링 */
	.dark-mode .image-list::-webkit-scrollbar {
		width: 6px;
	}

	.dark-mode .image-list::-webkit-scrollbar-track {
		background: #2d2d2d;
	}

	.dark-mode .image-list::-webkit-scrollbar-thumb {
		background-color: #555;
		border-radius: 3px;
	}

	.light-mode .image-list::-webkit-scrollbar {
		width: 6px;
	}

	.light-mode .image-list::-webkit-scrollbar-track {
		background: #f0f0f0;
	}

	.light-mode .image-list::-webkit-scrollbar-thumb {
		background-color: #ccc;
		border-radius: 3px;
	}
</style>