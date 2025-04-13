<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { writable } from 'svelte/store';
	import { X, Download, Upload } from 'lucide-svelte';

	export let images: ImageInfo[] = [];

	interface ImageInfo {
		id: string;
		src: string; // data URL or external URL
		alt: string;
		name: string;
		type: string;
		size: number;
		file?: File; // 실제 File 객체 (선택적)
	}

	const dispatch = createEventDispatcher();

	// 컨텍스트 메뉴 상태
	const contextMenu = writable<{ visible: boolean; x: number; y: number; imageId: string | null }>(
		{
			visible: false,
			x: 0,
			y: 0,
			imageId: null,
		}
	);

	function handleContextMenu(event: MouseEvent, imageId: string) {
		event.preventDefault();
		contextMenu.set({
			visible: true,
			x: event.clientX,
			y: event.clientY,
			imageId: imageId,
		});
	}

	function closeContextMenu() {
		contextMenu.update((state) => ({ ...state, visible: false }));
	}

	function insertImage() {
		const imageId = $contextMenu.imageId;
		if (imageId) {
			const image = images.find(img => img.id === imageId);
			if (image) {
				dispatch('insertImage', { id: image.id, src: image.src, alt: image.alt });
			}
		}
		closeContextMenu();
	}

	function removeImage() {
		const imageId = $contextMenu.imageId;
		if (imageId) {
			dispatch('removeImage', { id: imageId });
		}
		closeContextMenu();
	}

	// 외부 클릭 시 메뉴 닫기
	if (typeof window !== 'undefined') {
		window.addEventListener('click', (event) => {
			const menuElement = document.querySelector('.context-menu');
            if ($contextMenu.visible && menuElement && !menuElement.contains(event.target as Node)) {
				closeContextMenu();
			}
		});
	}
</script>

{#if images.length > 0}
	<div class="image-list-container">
		<h4>첨부된 이미지</h4>
		<div class="image-list">
			{#each images as image (image.id)}
				<div
					class="image-item"
					on:contextmenu={(e) => handleContextMenu(e, image.id)}
					title={`{image.name} (${Math.round(image.size / 1024)} KB)`}
				>
					<img src={image.src} alt={image.alt} />
				</div>
			{/each}
		</div>
	</div>
{/if}

{#if $contextMenu.visible}
	<div
		class="context-menu"
		style="top: {$contextMenu.y}px; left: {$contextMenu.x}px;"
	>
		<button on:click={insertImage}>
            <Upload size={14} /> 본문에 삽입
        </button>
		<button on:click={removeImage} class="remove-btn">
            <X size={14} /> 삭제
        </button>
	</div>
{/if}

<style>
	.image-list-container {
		padding: 10px;
		background-color: #f9f9f9;
		border-bottom: 1px solid #eee;
	}

	.image-list-container h4 {
		margin: 0 0 8px 0;
		font-size: 14px;
		color: #555;
	}

	.image-list {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.image-item {
		position: relative;
		width: 80px; /* 크기 조정 */
		height: 80px; /* 크기 조정 */
		border: 1px solid #ddd;
		border-radius: 4px;
		overflow: hidden;
		background-color: white;
		cursor: pointer;
		transition: transform 0.2s ease;
	}
    .image-item:hover {
        transform: scale(1.05);
    }

	.image-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.context-menu {
		position: fixed; /* 화면 기준 위치 */
		z-index: 1001; /* 툴바보다 위에 */
		background-color: white;
		border: 1px solid #ccc;
		border-radius: 4px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		padding: 5px;
		display: flex;
		flex-direction: column;
		gap: 4px;
        min-width: 120px;
	}

	.context-menu button {
        display: flex;
        align-items: center;
        gap: 6px;
		background: none;
		border: none;
		padding: 6px 10px;
		text-align: left;
		cursor: pointer;
		border-radius: 3px;
        font-size: 13px;
        color: #333;
	}

	.context-menu button:hover {
		background-color: #f0f0f0;
	}
    .context-menu button.remove-btn {
        color: #d00;
    }
    .context-menu button.remove-btn:hover {
        background-color: #fee;
    }
</style> 