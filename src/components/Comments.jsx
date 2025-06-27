import { signal, For, If, $, watch, onDispose } from 'refui'

const CommentFallback = () => (R) => (
	<div class="comment-item comment-placeholder">
		<div class="comment-meta">
			<span class="placeholder-text"></span>
		</div>
		<div class="comment-text">
			<span class="placeholder-text"></span>
			<span class="placeholder-text"></span>
		</div>
	</div>
)

const CommentItem = async ({ commentId, abort }) => {
	try {
		const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${commentId}.json`, { signal: abort })
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}
		const comment = await response.json()

		if (!comment || comment.deleted || comment.dead) {
			return () => null
		}

		const userUrl = `https://news.ycombinator.com/user?id=${comment.by}`

		return (R) => (
			<div class="comment-item">
				<div class="comment-meta">
					by{' '}
					<a href={userUrl} target="_blank">
						{comment.by}
					</a>
				</div>
				<div class="comment-text" innerHTML={comment.text}></div>
				<If condition={$(() => comment.kids && comment.kids.length > 0)}>
					{() => (
						<div class="comment-children">
							<For entries={$(() => comment.kids)}>
								{({ item: kidId }) => <CommentItem commentId={kidId} abort={abort} fallback={CommentFallback} />}
							</For>
						</div>
					)}
				</If>
			</div>
		)
	} catch (error) {
		if (error.name === 'AbortError') {
			console.log('Fetch aborted for CommentItem:', commentId)
			return () => null // Return null or a placeholder if aborted
		} else {
			throw error // Re-throw other errors
		}
	}
}

const Comments = ({ title, storyId, abort }) => {
	const storyData = signal(null)
	const comments = signal([])
	const isLoadingComments = signal(false)
	const isLoadingStory = signal(true)

	let currentAbortController = null
	const cancelRequests = () => {
		console.log('Comments unmounted or refreshed, aborting all pending requests.')
		currentAbortController?.abort()
	}
	abort.addEventListener('abort', cancelRequests)

	onDispose(cancelRequests)

	// Watch for changes in storyId and fetch story data
	watch(async () => {
		isLoadingStory.value = true
		storyData.value = null // Clear previous story data
		comments.value = [] // Clear previous comments
		if (!storyId.value) {
			isLoadingStory.value = false
			return
		}

		cancelRequests()
		currentAbortController = new AbortController()

		try {
			console.log('Fetching story data for storyId:', storyId.value)
			const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId.value}.json`, {
				signal: currentAbortController.signal
			})
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}
			const story = await response.json()
			if (!story || story.deleted || story.dead) {
				storyData.value = null // Indicate story not found/deleted
			} else {
				storyData.value = story
			}
		} catch (error) {
			if (error.name === 'AbortError') {
				console.log('Fetch aborted for story data:', storyId.value)
			} else {
				console.error('Error fetching story data:', error)
				storyData.value = null
			}
		} finally {
			isLoadingStory.value = false
		}
	})

	// Watch for changes in storyData.kids and fetch comments
	watch(async () => {
		const kids = storyData.value?.kids
		if (!kids || kids.length === 0) {
			comments.value = []
			return
		}
		isLoadingComments.value = true
		try {
			comments.value = kids
		} catch (error) {
			console.error('Error fetching comments:', error)
			comments.value = []
		} finally {
			isLoadingComments.value = false
		}
	})

	return (R) => (
		<div class="comments-container">
			<h3>{title}</h3>
			<If condition={isLoadingStory}>
				{() => <div class="loading">Loading story details...</div>}
				{() => (
					<If condition={storyData}>
						{() => (
							<If condition={isLoadingComments}>
								{() => <div class="loading">Loading comments...</div>}
								{() => (
									<If condition={$(() => comments.value.length > 0)}>
										{() => (
											<For entries={comments}>
												{({ item: commentId }) => (
													<CommentItem
														commentId={commentId}
														fallback={CommentFallback}
														catch={({ error }) => <div class="comment-error">Error: {error.message}</div>}
														abort={currentAbortController.signal}
													/>
												)}
											</For>
										)}
										{() => <div class="no-comments">No comments yet.</div>}
									</If>
								)}
							</If>
						)}
						{() => <div class="comments-container">Story not found or deleted.</div>}
					</If>
				)}
			</If>
		</div>
	)
}

export default Comments
