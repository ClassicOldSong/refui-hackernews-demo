import { signal, For, If, $, t, watch, onDispose, derivedExtract } from 'refui'
import { addTargetBlankToLinks } from '../utils/dom'

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

const ErrorFallback = ({ error }) => (R) => <div class="comment-error">Error: {error.message}</div>

const CommentItem = async ({ commentId, abort, storyData, depth }) => {
	const MAX_DEPTH = 3
	try {
		const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${commentId}.json`, { signal: abort })
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}
		const comment = await response.json()

		if (!comment || comment.dead) {
			return () => null
		}

		if (comment.deleted) {
			return (R) => <div class="comment-item deleted-comment">[deleted]</div>
		}

		const userUrl = `https://news.ycombinator.com/user?id=${comment.by}`
		const storyUrl = `https://news.ycombinator.com/item?id=${storyData.value.id}`

		const commentsPerPage = 5
		const commentsToShow = signal(depth >= MAX_DEPTH ? 0 : commentsPerPage)
		const childComments = $(() => comment.kids?.slice(0, commentsToShow.value) || [])

		if (depth >= MAX_DEPTH) {
			depth = 0
		}

		return (R) => (
			<div class="comment-item">
				<div class="comment-meta">
					by{' '}
					<a href={userUrl} target="_blank">
						{comment.by}
					</a>
				</div>
				<div class="comment-text">{addTargetBlankToLinks(comment.text)}</div>
				<If condition={$(() => comment.kids && comment.kids.length > 0)}>
					{() => (
						<div class="comment-children">
							<If condition={$(() => depth < MAX_DEPTH || commentsToShow.value > 0)}>
								{() => (
									<For entries={childComments}>
										{({ item: kidId }) => (
											<CommentItem commentId={kidId} abort={abort} fallback={CommentFallback} catch={ErrorFallback} storyData={storyData} depth={depth + 1} />
										)}
									</For>
								)}
							</If>
							<If condition={$(() => commentsToShow.value < comment.kids.length)}>
								{() => (
									<button class="load-more-btn" on:click={() => (commentsToShow.value += commentsPerPage)}>
										Load More ({$(() => comment.kids.length - commentsToShow.value)})
									</button>
								)}
							</If>
						</div>
					)}
				</If>
			</div>
		)
	} catch (error) {
		if (error.name === 'AbortError') {
			console.log('Fetch aborted for CommentItem:', commentId)
			return null // Return null or a placeholder if aborted
		} else {
			throw error // Re-throw other errors
		}
	}
}

const Comments = ({ storyData, abort }) => {
	const commentsPerPage = 10
	const commentsToShow = signal(commentsPerPage)
	const isLoadingComments = signal(false)
	const { title, id, by, score, descendants, url, kids: allComments } = derivedExtract(storyData, 'title', 'id', 'by', 'score', 'descendants', 'url', 'kids')

	const comments = $(() => allComments?.value?.slice(0, commentsToShow.value) || [])

	const commentsUrl = t`https://news.ycombinator.com/item?id=${id}`
	const userUrl = t`https://news.ycombinator.com/user?id=${by}`

	let currentAbortController = null
	const cancelRequests = () => {
		console.log('Comments unmounted or refreshed, aborting all pending requests.')
		currentAbortController?.abort()
	}
	abort.addEventListener('abort', cancelRequests)

	onDispose(cancelRequests)

	storyData.connect(() => {
		cancelRequests()
		currentAbortController = new AbortController()
	})

	return (R) => (
		<div class="comments-container">
			<div class="comments-header">
				<h3>
					<a href={url} target="_blank">
						{title}
					</a>
				</h3>
				<div class="story-meta">
					{score} points by{' '}
					<a href={userUrl} target="_blank">
						{by}
					</a>{' '}
					|{' '}
					<a href={commentsUrl} target="_blank">
						{descendants} comments
					</a>
				</div>
			</div>
			<If condition={isLoadingComments}>
				{() => <div class="loading">Loading comments...</div>}
				{() => (
					<>
						<If condition={$(() => comments.value.length > 0)}>
							{() => (
								<For entries={comments}>
									{({ item: commentId }) => (
										<CommentItem
											commentId={commentId}
											fallback={CommentFallback}
											catch={ErrorFallback}
											abort={currentAbortController.signal}
											storyData={storyData}
											depth={0}
										/>
									)}
								</For>
							)}
							{() => <div class="no-comments">No comments yet.</div>}
						</If>
						<If condition={$(() => commentsToShow.value < allComments.value?.length)}>
							{() => (
								<button class="load-more-btn" on:click={() => (commentsToShow.value += commentsPerPage)}>
									Load More ({$(() => allComments.value?.length - commentsToShow.value)})
								</button>
							)}
						</If>
					</>
				)}
			</If>
		</div>
	)
}

export default Comments
