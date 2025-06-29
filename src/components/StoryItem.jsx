import { onDispose } from 'refui'
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

const Story = async ({ storyId, onSelect, isSelected, abort }) => {
	try {
		const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`, { signal: abort })
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}
		const story = await response.json()

		// Don't render anything if the story is deleted, dead, or missing a title
		if (!story || story.deleted || story.dead || !story.title) {
			return () => null
		}

		const commentsUrl = `https://news.ycombinator.com/item?id=${story.id}`
		const userUrl = `https://news.ycombinator.com/user?id=${story.by}`

		// This is the render function that will be used once the promise resolves
		return (R) => (
			<div class="story" class:selected={isSelected} on:click={() => onSelect(story)}>
				<div class="story-title">
					<a href={story.url || commentsUrl} target="_blank" rel="noopener noreferrer">
						{story.title}
					</a>
				</div>
				<div class="story-meta">
					{story.score} points by{' '}
					<a href={userUrl} target="_blank">
						{story.by}
					</a>{' '}
					|{' '}
					<a href={commentsUrl} target="_blank">
						{story.descendants || 0} comments
					</a>{' '}
					| <span class="time">{formatTime(story.time)}</span>
				</div>
			</div>
		)
	} catch (error) {
		if (error.name === 'AbortError') {
			console.log('Fetch aborted for Story:', storyId)
			return () => null // Return a render function that renders nothing
		} else {
			throw error // Re-throw other errors
		}
	}
}

const StoryItem = ({ ...args }) => {
	return (R) => <Story {...args} fallback={StoryFallback} />
}

export { StoryItem }
