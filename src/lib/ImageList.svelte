<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Trash2, BookImage } from 'lucide-svelte';
	import { writable, type Writable } from 'svelte/store';

	interface ImageInfo {
		id: string;
		src: string;
		alt?: string;
		name: string;
		type: string;
		size: number;
		file?: File;
		element?: HTMLElement; // DOM 요소 참조 추가
	}

	export let images: ImageInfo[] = [];
	export let isDarkMode = false;

	// 이미지 리스트 확장/축소 상태
	let isExpanded = false;

	// 드래그 앤 드롭 관련 상태
	let draggedItem: ImageInfo | null = null;
	let dragOverItemId: string | null = null;
	let touchStartY: number = 0;
	let touchStartX: number = 0;
	let draggedElement: HTMLElement | null = null;
	let isDragging: boolean = false;
	let dragOffset = { x: 0, y: 0 };

	// 내부 이미지 저장소
	const imageStore: Writable<ImageInfo[]> = writable([...images]);
	
	// 외부에서 전달된 이미지가 변경될 때 내부 저장소 업데이트
	$: {
		imageStore.set([...images]);
	}

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

	// 마우스 드래그 핸들링 함수들
	function handleDragStart(e: DragEvent, item: ImageInfo, element: HTMLElement) {
		// 삭제 버튼 위에서 드래그 시작하지 않도록
		if ((e.target as HTMLElement).closest('.remove-button')) {
			e.preventDefault();
			return;
		}

		draggedItem = item;
		draggedElement = element;
		
		// 드래그 효과 설정
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', item.id);
			
			// 드래그 중인 요소 스타일 (투명하게)
			setTimeout(() => {
				if (draggedElement) draggedElement.classList.add('dragging');
			}, 0);
		}
	}

	function handleDragOver(e: DragEvent, targetId: string) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		
		if (draggedItem && targetId !== draggedItem.id) {
			dragOverItemId = targetId;
		}
	}

	function handleDragEnter(e: DragEvent, targetId: string) {
		e.preventDefault();
		if (draggedItem && targetId !== draggedItem.id) {
			dragOverItemId = targetId;
		}
	}

	function handleDragLeave() {
		dragOverItemId = null;
	}

	function handleDrop(e: DragEvent, targetId: string) {
		e.preventDefault();
		
		if (draggedItem && targetId !== draggedItem.id) {
			reorderImages(draggedItem.id, targetId);
		}
		
		// 상태 초기화
		draggedItem = null;
		dragOverItemId = null;
		if (draggedElement) draggedElement.classList.remove('dragging');
		draggedElement = null;
	}

	function handleDragEnd() {
		// 상태 초기화
		draggedItem = null;
		dragOverItemId = null;
		if (draggedElement) draggedElement.classList.remove('dragging');
		draggedElement = null;
	}

	// 터치 이벤트 핸들링 함수들
	function handleTouchStart(e: TouchEvent, item: ImageInfo, element: HTMLElement) {
		// 삭제 버튼 위에서 터치 시작하지 않도록
		if ((e.target as HTMLElement).closest('.remove-button')) return;
		
		const touch = e.touches[0];
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;
		
		// 요소의 바운딩 박스를 가져와서 터치 위치와의 오프셋 계산
		const rect = element.getBoundingClientRect();
		dragOffset = {
			x: touchStartX - rect.left,
			y: touchStartY - rect.top
		};
		
		// 딜레이 후에 드래그 시작 (클릭과 드래그를 구분하기 위함)
		setTimeout(() => {
			if (element.matches(':active')) { // 여전히 터치 중인지 확인
				isDragging = true;
				draggedItem = item;
				draggedElement = element;
				element.classList.add('touch-dragging');
				
				// 원래 위치에 고스트 요소 생성
				const ghost = element.cloneNode(true) as HTMLElement;
				ghost.classList.add('ghost');
				element.parentNode?.insertBefore(ghost, element.nextSibling);
				
				// 드래그 요소를 절대 위치로 변경하여 페이지 위에 떠 있게 함
				element.style.position = 'absolute';
				element.style.zIndex = '1000';
				element.style.width = `${rect.width}px`;
				element.style.height = `${rect.height}px`;
				updateDragElementPosition(e);
			}
		}, 200); // 200ms 후에 드래그 시작
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging || !draggedItem || !draggedElement) return;
		
		e.preventDefault(); // 스크롤 방지
		updateDragElementPosition(e);
		
		// 현재 터치 위치 아래에 있는 요소 확인
		const touch = e.touches[0];
		const elementsBelow = document.elementsFromPoint(touch.clientX, touch.clientY);
		
		// 이미지 아이템 요소를 찾음
		const imageItemBelow = elementsBelow.find(el => 
			el.classList.contains('image-item') && 
			el !== draggedElement &&
			!el.classList.contains('ghost')
		) as HTMLElement | undefined;
		
		if (imageItemBelow) {
			const targetId = imageItemBelow.dataset.id;
			if (targetId && targetId !== draggedItem.id) {
				dragOverItemId = targetId;
			}
		}
	}

	function updateDragElementPosition(e: TouchEvent) {
		if (!draggedElement) return;
		
		const touch = e.touches[0];
		const x = touch.clientX - dragOffset.x;
		const y = touch.clientY - dragOffset.y;
		
		draggedElement.style.left = `${x}px`;
		draggedElement.style.top = `${y}px`;
	}

	function handleTouchEnd() {
		if (!isDragging || !draggedItem || !draggedElement) return;
		
		// 드롭이 발생한 요소 위에서 이미지 순서 재정렬
		if (dragOverItemId && dragOverItemId !== draggedItem.id) {
			reorderImages(draggedItem.id, dragOverItemId);
		}
		
		// 모든 상태 초기화 및 요소 정리
		cleanupDragState();
	}

	function cleanupDragState() {
		if (draggedElement) {
			// 스타일 및 클래스 제거
			draggedElement.style.position = '';
			draggedElement.style.zIndex = '';
			draggedElement.style.width = '';
			draggedElement.style.height = '';
			draggedElement.style.left = '';
			draggedElement.style.top = '';
			draggedElement.classList.remove('touch-dragging');
			
			// 고스트 요소 제거
			const ghost = document.querySelector('.ghost');
			if (ghost) ghost.remove();
		}
		
		// 상태 초기화
		isDragging = false;
		draggedItem = null;
		dragOverItemId = null;
		draggedElement = null;
	}

	// 이미지 순서 재정렬 함수
	function reorderImages(sourceId: string, targetId: string) {
		imageStore.update(currentImages => {
			const reorderedImages = [...currentImages];
			const sourceIndex = reorderedImages.findIndex(img => img.id === sourceId);
			const targetIndex = reorderedImages.findIndex(img => img.id === targetId);
			
			if (sourceIndex !== -1 && targetIndex !== -1) {
				// 소스 요소를 제거하고
				const [movedItem] = reorderedImages.splice(sourceIndex, 1);
				// 대상 위치에 삽입
				reorderedImages.splice(targetIndex, 0, movedItem);
			}
			
			return reorderedImages;
		});
	}
</script>

{#if $imageStore.length > 0}
	<div class="image-list-container {isDarkMode ? 'dark-mode' : 'light-mode'}">
		<div class="image-list-header" on:click={toggleImageList} role="button" tabindex="0">
			<div class="header-content">
				<BookImage size={16} />
				<span>이미지 리스트 ({$imageStore.length})</span>
			</div>
			<div class="toggle-indicator" style={isExpanded ? 'transform: rotate(0deg)' : 'transform: rotate(-90deg)'}>{isExpanded ? '▼' : '◀'}</div>
		</div>

		{#if isExpanded}
			<div class="image-list">
				{#each $imageStore as image, i (image.id)}
					<div class="image-item" 
						class:draggable={true}
						class:drag-over={dragOverItemId === image.id}
						data-id={image.id}
						draggable="true"
						on:dragstart={(e) => handleDragStart(e, image, e.currentTarget)}
						on:dragover={(e) => handleDragOver(e, image.id)}
						on:dragenter={(e) => handleDragEnter(e, image.id)}
						on:dragleave={handleDragLeave}
						on:drop={(e) => handleDrop(e, image.id)}
						on:dragend={handleDragEnd}
						on:touchstart={(e) => handleTouchStart(e, image, e.currentTarget)}
						on:touchmove|preventDefault={handleTouchMove}
						on:touchend={handleTouchEnd}
						on:touchcancel={handleTouchEnd}
						bind:this={image.element}>
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

	
	.light-mode {
		background-color: #f8f9fa;
		border: 1px solid #e0e0e0;
		color: #333;
	}

	
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
		font-size: 12px;
	}

	.image-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 8px;
		padding: 12px;
		max-height: 200px;
		overflow-y: auto;
		position: relative; 
	}

	.image-item {
		border-radius: 4px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		position: relative;
		touch-action: none; 
		transition: transform 0.1s ease, box-shadow 0.2s ease;
		cursor: grab;
	}

	
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

	
	.image-item.dragging {
		opacity: 0.5;
		transform: scale(0.95);
	}

	.image-item.touch-dragging {
		opacity: 0.8;
		transform: scale(1.05);
		box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
	}
	
	.image-item.drag-over {
		transform: scale(1.05);
		box-shadow: 0 0 0 2px #007bff;
	}

	.dark-mode .image-item.drag-over {
		box-shadow: 0 0 0 2px #60a5fa;
	}

	
	.image-item.ghost {
		opacity: 0.4;
		pointer-events: none;
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
		pointer-events: none; 
	}

	.image-item:hover .image-preview img {
		transform: scale(1.1);
	}

	.image-item.dragging .image-preview img,
	.image-item.touch-dragging .image-preview img {
		transform: none; 
	}

	.image-info {
		padding: 6px 8px;
		flex-grow: 1;
		pointer-events: none; 
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
		z-index: 5; 
	}

	.image-item:hover .image-actions {
		opacity: 1;
	}

	.image-item.dragging .image-actions,
	.image-item.touch-dragging .image-actions {
		display: none; 
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
		z-index: 6; 
	}

	.remove-button:hover {
		background-color: rgba(255, 0, 0, 0.3);
	}

	
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
	
	
	@media (hover: none) and (pointer: coarse) {
		.image-actions {
			opacity: 1; 
			background-color: rgba(0, 0, 0, 0.7);
		}
		
		.image-item {
			touch-action: none;
		}
		
		
		.image-info::before {
			content: "︙";
			position: absolute;
			bottom: 4px;
			right: 4px;
			font-size: 14px;
			color: #aaa;
		}
	}
</style>