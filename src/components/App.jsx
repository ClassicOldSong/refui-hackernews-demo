import { signal, For, If, watch, $, useEffect, onDispose, onCondition } from 'refui'
import { StoryItem } from './StoryItem.jsx'
import Comments from './Comments'
import { version } from 'refui/package.json'

const App = ({ updateThemeColor, needRefresh, offlineReady, checkSWUpdate, updateSW, installPrompt }) => {
	const SECTIONS = {
		Top: 'topstories',
		New: 'newstories',
		Best: 'beststories',
		Ask: 'askstories',
		Show: 'showstories',
		Jobs: 'jobstories'
	}

	const getSectionFromHash = () => {
		const hash = window.location.hash.substring(1) // Remove #
		const section = Object.values(SECTIONS).find((s) => s === hash)
		return section || 'topstories'
	}

	const isDarkMode = signal(localStorage.getItem('darkMode') === 'true')

	watch(() => {
		if (isDarkMode.value) {
			document.body.classList.add('dark-mode')
		} else {
			document.body.classList.remove('dark-mode')
		}
		localStorage.setItem('darkMode', isDarkMode.value.toString())

		updateThemeColor()
	})

	// --- State Signals ---
	const allStoryIds = signal([]) // Stores all fetched story IDs for the current section
	const storiesLimit = signal(30) // Number of stories to display
	const currentSection = signal(getSectionFromHash())
	const isLoading = signal(false)
	const selectedStory = signal()
	const selectedStoryId = signal(null)
	const storyListWidth = signal(parseFloat(localStorage.getItem('storyListWidth') || '30'))
	const refreshSignal = signal()

	const matchStoryId = onCondition(selectedStoryId)

	watch(() => {
		localStorage.setItem('storyListWidth', storyListWidth.value.toString())
	})

	const startDragging = (e) => {
		e.preventDefault()
		const startX = e.clientX
		const startWidth = storyListWidth.value

		const doDrag = (e) => {
			const newWidth = startWidth + ((e.clientX - startX) / window.innerWidth) * 100
			storyListWidth.value = Math.max(20, Math.min(80, newWidth)) // Clamp between 20% and 80%
		}

		const stopDrag = () => {
			window.removeEventListener('mousemove', doDrag)
			window.removeEventListener('mouseup', stopDrag)
		}

		window.addEventListener('mousemove', doDrag)
		window.addEventListener('mouseup', stopDrag)
	}

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
	async function fetchStoryIds(section, abort) {
		if (!section) return
		isLoading.value = true

		try {
			const response = await fetch(`https://hacker-news.firebaseio.com/v0/${section}.json`, {
				signal: abort
			})
			const ids = await response.json()
			if (ids[0] !== allStoryIds.value[0]) {
				storiesLimit.value = 30
			}
			allStoryIds.value = ids
			refreshSignal.trigger()
		} catch (error) {
			if (error.name === 'AbortError') {
				console.log('Fetch aborted for story IDs:', section)
			} else {
				console.error(`Error fetching ${section} story IDs:`, error)
			}
		} finally {
			isLoading.value = false
		}
	}

	let abortController = null

	// --- Initial Setup & Reactivity ---
	useEffect(() => {
		abortController = new AbortController()
		fetchStoryIds(currentSection.value, abortController.signal)
		allStoryIds.value = []
		return () => {
			console.log('App component unmounted or refreshed, aborting all pending requests.')
			abortController.abort()
		}
	})

	return (R) => (
		<>
			<div class="tabs">
				<h1 class="page-title">HackerNews</h1>
				{Object.entries(SECTIONS).map(([name, value]) => (
					<button class="btn" class:active={currentSection.eq(value)} on:click={() => (currentSection.value = value)}>
						{name}
					</button>
				))}
				<span class="tab-spacer" />
				<span>
					Proudly made with{' '}
					<a href="https://github.com/SudoMaker/rEFui" target="_blank" class="tab-link">
						rEFui
					</a>{' '}
					v{version}
				</span>
				<button class="btn" on:click={() => {
					fetchStoryIds(currentSection.value, abortController.signal)
				}} disabled={isLoading}>
					&#x21bb;{/* reload */}
				</button>
				<button class="btn" on:click={() => (isDarkMode.value = !isDarkMode.value)}>
					{isDarkMode.and('Light').or('Dark')}
				</button>
				<If condition={installPrompt}>
					{() => (
						<button
							class="btn"
							class:active={offlineReady}
							on:click={async () => {
								const result = await installPrompt.value.prompt()
								if (result.outcome === 'accepted') installPrompt.value = null
							}}
						>
							Install
						</button>
					)}
				</If>
				<If condition={checkSWUpdate.and(needRefresh)}>
					{() => (
						<button
							class="btn active"
							on:click={() => {
								if (needRefresh.value) return updateSW()
								else checkSWUpdate.value()
							}}
						>
							Update
						</button>
					)}
					{() => (
						<a
							href="https://github.com/ClassicOldSong/refui-hackernews-demo"
							target="_blank"
							class="btn"
							on:click={() => {
								checkSWUpdate.value?.()
							}}
						>
							GitHub
						</a>
					)}
				</If>
			</div>
			<div class="main-layout">
				<div class="story-list" style={$(() => `flex-basis: ${storyListWidth.value}%;`)}>
					<If condition={isLoading}>
						{() => <div class="loading">Loading story list...</div>}
					</If>
					<For entries={storyIds}>
						{({ item: storyId }) => (
							<StoryItem
								storyId={storyId}
								onSelect={(story) => {
									selectedStoryId.value = story.id
									selectedStory.value = story
								}}
								match={matchStoryId}
								abort={abortController.signal}
								refreshSignal={refreshSignal}
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
				</div>
				<div class="resizer" on:mousedown={startDragging}></div>
				<div class="comments-panel" style:flexBasis={$(() => `${100 - storyListWidth.value}%`)}>
					<If condition={selectedStoryId}>
						{(R) => <Comments storyData={selectedStory} storyId={selectedStoryId} />}
						{() => <div class="no-story-selected">Select a story to view comments.</div>}
					</If>
				</div>
			</div>
		</>
	)
}

export default App
