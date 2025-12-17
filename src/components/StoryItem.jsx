import { peek, signal, $, derivedExtract, Fn } from 'refui'
import { formatTime } from '../utils/time.js'
import { addS } from '../utils/misc.js'

const StoryFallback = () => (
	<div class="story story-placeholder">
		<div class="story-title">
			<a class="placeholder-text"></a>
		</div>
		<div class="story-meta">
			<span class="placeholder-text"></span>
		</div>
	</div>
)

const StoryError =
	({ error }) => <div class="story-error">Error: {error.message}</div>

const Story = ({ story, isSelected, onSelect, savedIds, onToggleSaved }) => {
	const { id, by, url, title, time, score, descendants } = derivedExtract(
		story,
		'id',
		'by',
		'url',
		'title',
		'time',
		'score',
		'descendants'
	)

	const commentsUrl = $(() => `https://news.ycombinator.com/item?id=${id.value}`)
	const userUrl = $(() => `https://news.ycombinator.com/user?id=${by.value}`)
	const storyHref = $(() => url.value || commentsUrl.value)
	const saved = $(() => savedIds?.value?.includes(id.value))
	return (
		<a
			class="story"
			class:selected={isSelected}
			href={storyHref}
			target="_blank"
			rel="noopener noreferrer"
			on:click={(e) => {
				if (e.target.tagName === 'A' && e.target.className !== 'story') {
					return
				}
				e.preventDefault()
				onSelect(story.value)
			}}
		>
			<div class="story-title">
				<span class="story-title-text">{title}</span>
				<button
					class="save-toggle"
					aria-pressed={saved}
					aria-label={$(() => (saved.value ? 'Unsave' : 'Save'))}
					on:click={(e) => {
						e.preventDefault()
						e.stopPropagation()
						onToggleSaved?.(story.value)
					}}
				>
					{$(() => (saved.value ? '★' : '☆'))}
				</button>
			</div>
			<div class="story-meta">
				{score} point{addS(score)} by{' '}
				<a href={userUrl} target="_blank">
					{by}
				</a>{' '}
				|{' '}
				<a href={commentsUrl} target="_blank">
					{$(() => descendants.value || '0')} comment{addS(descendants)}
				</a>{' '}
				| <span class="time">{formatTime(time)}</span>
			</div>
		</a>
	)
}

const load = async (storyId, abort) => {
	const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`, { signal: abort })
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`)
	}
	const story = await response.json()

	// Don't render anything if the story is deleted, dead, or missing a title
	if (!story || story.deleted || story.dead || !story.title) {
		return null
	}

	return story
}

const StoryItem = ({ storyId, onSelect, match, abort, whenRefresh, savedIds, onToggleSaved }) => {
	const state = signal('')
	const storySignal = signal({})
	const isSelected = match(storyId)
	let error = null

	const reload = async (section, _abort) => {
		if (peek(state) === 'loading') {
			return
		}
		if (error || !peek(state)) {
			state.value = 'loading'
			error = null
		}
		try {
			const newStory = await load(storyId, _abort)
			if (!newStory) {
				state.value = ''
				return
			}
			if (peek(isSelected)) {
				onSelect(newStory)
			}
			storySignal.value = newStory
			state.value = 'ready'
		} catch (err) {
			if (err.name === 'AbortError') {
				console.log('Fetch aborted for Story:', storyId)
				state.value = 'aborted'
			} else {
				error = err
				state.value = 'error'
			}
		}
	}

	whenRefresh(reload)
	reload(abort)

	const renderStory = () => (
		<Story
			story={storySignal}
			isSelected={isSelected}
			onSelect={onSelect}
			savedIds={savedIds}
			onToggleSaved={onToggleSaved}
		/>
	)
	return (
		<Fn>
			{() => {
				switch (state.value) {
					case 'loading': {
						return () => <StoryFallback />
					}
					case 'ready': {
						return renderStory
					}
					case 'error': {
						return () => <StoryError error={error} />
					}
					case 'aborted':
						return 'aborted'
					default: {
						return null
					}
				}
			}}
		</Fn>
	)
}

export { StoryItem }
