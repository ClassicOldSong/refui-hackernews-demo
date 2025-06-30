import { onDispose, peek, signal, $, touch, derivedExtract, Fn, watch } from 'refui'
import { formatTime } from '../utils/time.js'

const StoryFallback = () => (R) => (
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
	({ error }) =>
	(R) => <div class="story-error">Error: {error.message}</div>

const Story = ({ story, isSelected, onSelect }) => {
	const { score, descendants } = derivedExtract(
		story,
		'score',
		'descendants'
	)
	const { id, by, url, title, time } = story.value

	const commentsUrl = `https://news.ycombinator.com/item?id=${id}`
	const userUrl = `https://news.ycombinator.com/user?id=${by}`
	return (R) => (
		<div class="story" class:selected={isSelected} on:click={() => onSelect(story.value)}>
			<div class="story-title">
				<a href={url || commentsUrl} target="_blank" rel="noopener noreferrer">
					{title}
				</a>
			</div>
			<div class="story-meta">
				{score} point{$(() => (score.value === 1 ? '' : 's'))} by{' '}
				<a href={userUrl} target="_blank">
					{by}
				</a>{' '}
				|{' '}
				<a href={commentsUrl} target="_blank">
					{$(() => descendants.value || 0)} comments
				</a>{' '}
				| <span class="time">{formatTime(time)}</span>
			</div>
		</div>
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

const StoryItem = ({ storyId, onSelect, match, abort, refreshSignal }) => {
	const state = signal('')
	const storySignal = signal({})
	const isSelected = match(storyId)
	let error = null

	const reload = async () => {
		touch(refreshSignal)
		if (peek(state) === 'loading') {
			return
		}
		if (error || !peek(state)) {
			state.value = 'loading'
			error = null
		}
		try {
			const newStory = await load(storyId, abort)
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

	watch(reload)

	return (R) => {
		const renderStory = () => <Story story={storySignal} isSelected={isSelected} onSelect={onSelect} />
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
						default: {
							return null
						}
					}
				}}
			</Fn>
		)
	}
}

export { StoryItem }
