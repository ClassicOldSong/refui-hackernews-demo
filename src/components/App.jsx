import { signal, For, If, watch, $, useEffect, onDispose } from 'refui'
import { StoryItem } from './StoryItem.jsx'
import Comments from './Comments'

const App = () => {
	const SECTIONS = {
		Top: 'topstories',
		New: 'newstories',
		Best: 'beststories',
		Ask: 'askstories',
		Show: 'showstories',
		Jobs: 'jobstories'
	}

	// Helper to get section from hash, default to 'topstories'
	const getSectionFromHash = () => {
		const hash = window.location.hash.substring(1) // Remove #
		const section = Object.values(SECTIONS).find((s) => s === hash)
		return section || 'topstories'
	}

	// --- State Signals ---
	const allStoryIds = signal([]) // Stores all fetched story IDs for the current section
	const storiesLimit = signal(30) // Number of stories to display
	const currentSection = signal(getSectionFromHash())
	const isLoading = signal(false)
	const selectedStory = signal()
	const selectedStoryId = signal(null)
	const storyListWidth = signal(parseFloat(localStorage.getItem('storyListWidth') || '30'));

	watch(() => {
		localStorage.setItem('storyListWidth', storyListWidth.value.toString());
	});

	const startDragging = (e) => {
		e.preventDefault();
		const startX = e.clientX;
		const startWidth = storyListWidth.value;

		const doDrag = (e) => {
			const newWidth = startWidth + ((e.clientX - startX) / window.innerWidth) * 100;
			storyListWidth.value = Math.max(20, Math.min(80, newWidth)); // Clamp between 20% and 80%
		};

		const stopDrag = () => {
			window.removeEventListener('mousemove', doDrag);
			window.removeEventListener('mouseup', stopDrag);
		};

		window.addEventListener('mousemove', doDrag);
		window.addEventListener('mouseup', stopDrag);
	};

	let abortController = null
	const cancelRequests = () => {
		console.log('App component unmounted or refreshed, aborting all pending requests.')
		abortController?.abort()
	}
	onDispose(cancelRequests)

	// Derived signal for stories currently displayed
	const storyIds = $(() => allStoryIds.value.slice(0, storiesLimit.value))

	// --- Routing Logic ---
	// Update hash when currentSection changes
	watch(() => {
		if (window.location.hash.substring(1) !== currentSection.value) {
			window.location.hash = currentSection.value
		}
	})

	// Update currentSection when hash changes (e.g., back/forward buttons)

	useEffect(() => {
		const hashChangeEffect = () => {
			currentSection.value = getSectionFromHash()
		}
		window.addEventListener('hashchange', hashChangeEffect)
		return () => window.removeEventListener('hashchange', hashChangeEffect)
	})

	// --- Data Fetching ---
	async function fetchStoryIds(section) {
		if (!section) return
		isLoading.value = true
		allStoryIds.value = [] // Clear previous stories
		storiesLimit.value = 30 // Reset limit when fetching new section

		cancelRequests()
		abortController = new AbortController()

		try {
			const response = await fetch(`https://hacker-news.firebaseio.com/v0/${section}.json`, {
				signal: abortController.signal
			})
			const ids = await response.json()
			allStoryIds.value = ids
		} catch (error) {
			if (error.name === 'AbortError') {
				console.log('Fetch aborted for story IDs:', section)
			} else {
				console.error(`Error fetching ${section} story IDs:`, error)
				allStoryIds.value = [] // Clear stories on error
			}
		} finally {
			isLoading.value = false
		}
	}

	// --- Initial Setup & Reactivity ---
	watch(() => fetchStoryIds(currentSection.value))

	return (R) => (
		<>
			<div class="tabs">
				<h1 class="page-title">HackerNews</h1>
				{Object.entries(SECTIONS).map(([name, value]) => (
					<button class:active={currentSection.eq(value)} on:click={() => (currentSection.value = value)}>
						{name}
					</button>
				))}
				<button class="refresh-btn" on:click={() => fetchStoryIds(currentSection.value)} disabled={isLoading}>
					&#x21bb;
				</button>
			</div>
			<div class="main-layout">
				<div class="story-list" style={$(() => `flex-basis: ${storyListWidth.value}%;`)}>
					<If condition={isLoading}>
						{() => <div class="loading">Loading story list...</div>}
						{() => (
							<>
								<For entries={storyIds}>
									{({ item: storyId }) => (
										<StoryItem
											storyId={storyId}
											onSelect={(story) => {
												selectedStoryId.value = story.id
												selectedStory.value = story
											}}
											isSelected={selectedStoryId.eq(storyId)}
											catch={({ error }) => <div class="story-error">Error: {error.message}</div>}
											abort={abortController.signal}
										/>
									)}
								</For>
								<If condition={$(() => storyIds.value.length < allStoryIds.value.length)}>
									{() => (
										<button class="load-more-btn" on:click={() => (storiesLimit.value += 30)} disabled={isLoading}>
											Load More
										</button>
									)}
								</If>
							</>
						)}
					</If>
				</div>
				<div class="resizer" on:mousedown={startDragging}></div>
				<div class="comments-panel" style={$(() => `flex-basis: ${100 - storyListWidth.value}%;`)}>
					<If condition={selectedStoryId}>
						{(R) => <Comments storyData={selectedStory} storyId={selectedStoryId} abort={abortController.signal} />}
						{() => <div class="no-story-selected">Select a story to view comments.</div>}
					</If>
				</div>
			</div>
		</>
	)
}

export default App
