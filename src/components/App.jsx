import { signal, For, If, watch, $, useEffect, onDispose, onCondition, nextTick, computed, useAction } from 'refui'
import { StoryItem } from './StoryItem.jsx'
import Comments from './Comments'
import { version } from 'refui/package.json'

const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

const App = ({ updateThemeColor, needRefresh, offlineReady, checkSWUpdate, updateSW, installPrompt }) => {
	const SECTIONS = {
		topstories: 'Top',
		newstories: 'New',
		beststories: 'Best',
		askstories: 'Ask',
		showstories: 'Show',
		jobstories: 'Jobs'
	}

	const theme = signal(localStorage.getItem('theme') || 'auto') // 'auto', 'light', 'dark'
	const systemIsDark = signal(window.matchMedia('(prefers-color-scheme: dark)').matches)

	const isDarkMode = computed(() => {
		if (theme.value === 'auto') {
			return systemIsDark.value
		} else {
			return theme.value === 'dark'
		}
	})

	const cycleTheme = () => {
		const modes = ['auto', 'light', 'dark']
		const nextIndex = (modes.indexOf(theme.value) + 1) % modes.length
		theme.value = modes[nextIndex]
	}

	const themeButtonLabel = computed(() => {
		switch (theme.value) {
			case 'light':
				return 'Light'
			case 'dark':
				return 'Dark'
			default:
				return 'Auto'
		}
	})

	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
		const handleChange = (e) => {
			systemIsDark.value = e.matches
		}
		mediaQuery.addEventListener('change', handleChange)
		return () => mediaQuery.removeEventListener('change', handleChange)
	})

	watch(() => {
		localStorage.setItem('theme', theme.value)
	})

	watch(() => {
		if (isDarkMode.value) {
			document.body.classList.add('dark-mode')
		} else {
			document.body.classList.remove('dark-mode')
		}
		updateThemeColor()
	})

	const parseHash = () => {
		const hash = window.location.hash.substring(1)
		const parts = hash.split('/')

		let section = 'topstories' // Default section
		let storyId = null

		if (parts.length === 1 && SECTIONS[parts[0]]) {
			section = parts[0]
		} else if (parts.length === 3 && SECTIONS[parts[0]] && parts[1] === 'story' && !isNaN(parseInt(parts[2], 10))) {
			section = parts[0]
			storyId = parseInt(parts[2], 10)
		} else if (parts.length === 2 && parts[0] === 'story' && !isNaN(parseInt(parts[1], 10))) {
			// Handle old format #story/123
			storyId = parseInt(parts[1], 10)
		}

		return { section, storyId }
	}

	const updateHash = (section, storyId, replace = false) => {
		const oldHash = window.location.hash.substring(1)
		const wasOnStory = oldHash.includes('/story/')

		let newHash = section
		if (storyId) {
			newHash = `${section}/story/${storyId}`
		}
		if (oldHash !== newHash) {
			if (replace || (!storyId && wasOnStory)) {
				location.replace(`#${newHash}`)
			} else {
				window.location.hash = newHash
			}
		}
	}

	const { section: initialSection, storyId: initialStoryId } = parseHash()

	const allStoryIds = signal([]) // Stores all fetched story IDs for the current section
	const storiesLimit = signal(30) // Number of stories to display
	const currentSection = signal(initialSection)
	const isLoading = signal(false)
	const selectedStoryId = signal(initialStoryId)
	const selectedStory = signal()
	const storyListWidth = signal(parseFloat(localStorage.getItem('storyListWidth') || '30'))
	const isSmallScreen = signal(window.innerWidth < 768)
	const menuVisible = signal(false)
	const menuRef = signal(null)
	const menuBtnRef = signal(null)
	const storyListRef = signal(null)
	const commentsPanelRef = signal(null)
	const [whenRefresh, refresh] = useAction()

	whenRefresh((section) => {
		if (storyListRef.value) {
			storyListRef.value.scrollTop = 0
		}
	})

	watch(() => {
		// When the selected story changes, scroll the comments panel to the top.
		selectedStoryId.value
		if (commentsPanelRef.value) {
			commentsPanelRef.value.scrollTop = 0
		}
	})

	const matchStoryId = onCondition(selectedStoryId)

	watch(() => {
		localStorage.setItem('storyListWidth', storyListWidth.value.toString())
	})

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				menuRef.value &&
				!menuRef.value.contains(event.target) &&
				menuBtnRef.value &&
				!menuBtnRef.value.contains(event.target)
			) {
				menuVisible.value = false
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
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

	// Update currentSection when hash changes (e.g., back/forward buttons)

	const hashChangeEffect = () => {
		const { section: newSection, storyId: newStoryId } = parseHash()

		if (newSection !== currentSection.value) {
			currentSection.value = newSection
		}
		if (newStoryId !== selectedStoryId.value) {
			selectedStoryId.value = newStoryId
		}
	}

	const onResize = () => {
		isSmallScreen.value = window.innerWidth < 768
	}

	useEffect(() => {
		window.addEventListener('hashchange', hashChangeEffect)
		window.addEventListener('resize', onResize)

		return () => {
			window.removeEventListener('hashchange', hashChangeEffect)
			window.removeEventListener('resize', onResize)
		}
	})

	const noTransition = signal(false)
	watch(() => {
		updateHash(currentSection.value, selectedStoryId.value)
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
			refresh()
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

	const handleSectionChange = (name) => {
		currentSection.value = name
		selectedStoryId.value = null // Clear selected story
		menuVisible.value = false
	}

	const Sections = () => (R) => (
		<>
			{Object.entries(SECTIONS).map(([name, value]) => (
				<button class="btn" class:active={currentSection.eq(name)} on:click={() => handleSectionChange(name)}>
					{value}
				</button>
			))}
		</>
	)

	return (R) => (
		<>
			<div class="tabs">
				<If condition={selectedStoryId.and(isSmallScreen)}>
					{() => (
						<button
							class="btn back-btn hide-on-large-screen"
							on:click={() => {
								noTransition.value = false
								history.back()
							}}
						>
							←
						</button>
					)}
					{() => (
						<button
							$ref={menuBtnRef}
							class="btn"
							class:active={needRefresh}
							class:hidden={() => !isSmallScreen.value}
							on:click={() => (menuVisible.value = !menuVisible.value)}
						>
							{$(() => SECTIONS[currentSection])}
						</button>
					)}
				</If>
				<h1 class="page-title">HackerNews</h1>
				<div $ref={menuRef} class:visible={menuVisible} class="collapsible-menu">
					<Sections />
					<button class="btn" on:click={cycleTheme}>
						{themeButtonLabel}
					</button>
					<a
						href="https://github.com/ClassicOldSong/refui-hackernews-demo"
						target="_blank"
						class="btn"
						on:click={() => {
							checkSWUpdate.value?.()
						}}
					>
						Star on GitHub
					</a>
					<If condition={needRefresh}>
						{() => (
							<button
								class="btn active"
								on:click={() => {
									if (needRefresh.value) return updateSW()
									else checkSWUpdate.value?.()
								}}
							>
								Update
							</button>
						)}
					</If>
					<span>
						Proudly made with{' '}
						<a href="https://github.com/SudoMaker/rEFui" target="_blank" class="tab-link">
							rEFui
						</a>{' '}
						v{version}
					</span>
				</div>
				<div class="overlay" class:visible={menuVisible} on:click={() => (menuVisible.value = false)}></div>
				<div class="nav-buttons">
					<Sections />
				</div>
				<span class="tab-spacer" />
				<span class="hide-on-small-screen">
					Proudly made with{' '}
					<a href="https://github.com/SudoMaker/rEFui" target="_blank" class="tab-link">
						rEFui
					</a>{' '}
					v{version}
				</span>
				<button
					class="btn"
					class:hidden={selectedStoryId.and(isSmallScreen)}
					on:click={() => {
						fetchStoryIds(currentSection.value, abortController.signal)
					}}
					disabled={isLoading}
				>
					&#x21bb;{/* reload */}
				</button>
				<If condition={isSmallScreen.inverseOr(isSmallScreen.and(selectedStoryId))}>
					{() => (
						<button class="btn" on:click={cycleTheme}>
							{themeButtonLabel}
						</button>
					)}
				</If>
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
							class="btn active hide-on-smaller-screen"
							on:click={() => {
								if (needRefresh.value) return updateSW()
								else checkSWUpdate.value?.()
							}}
						>
							Update
						</button>
					)}
					{() => (
						<a
							href="https://github.com/ClassicOldSong/refui-hackernews-demo"
							target="_blank"
							class="btn hide-on-smaller-screen"
							on:click={() => {
								checkSWUpdate.value?.()
							}}
						>
							Star
						</a>
					)}
				</If>
			</div>
			<div
				class="main-layout"
				class:show-comments={selectedStoryId.and(isSmallScreen)}
				class:no-transition={noTransition}
			>
				<div $ref={storyListRef} class="story-list" style={$(() => `flex-basis: ${storyListWidth.value}%;`)}>
					<If condition={isLoading}>{() => <div class="loading">Loading story list...</div>}</If>
					<For entries={storyIds}>
						{({ item: storyId }) => (
							<StoryItem
								storyId={storyId}
								onSelect={(story) => {
									noTransition.value = false
									setTimeout(() => {
										selectedStory.value = story
										selectedStoryId.value = story.id
									}, 0)
								}}
								match={matchStoryId}
								abort={abortController.signal}
								whenRefresh={whenRefresh}
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
				<div
					$ref={commentsPanelRef}
					class="comments-panel"
					style:flexBasis={$(() => `${100 - storyListWidth.value}%`)}
					on:transitionend={
						isIOS &&
						(() => {
							noTransition.value = true
						})
					}
				>
					<Comments storyId={selectedStoryId} initialStoryData={selectedStory} />
				</div>
			</div>
		</>
	)
}

export default App
