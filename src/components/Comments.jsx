import { signal, For, If, $, t, watch, onDispose, derivedExtract, Render, useEffect, readAll, tick } from 'refui'
import { Parse } from 'refui/extras/parse.js'
import { addTargetBlankToLinks } from '../utils/dom.js'
import { formatTime } from '../utils/time.js'
import { addS } from '../utils/misc.js'

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

const ErrorFallback =
	({ error }) =>
	(R) => <div class="comment-error">Error: {error.message}</div>

const CommentItem = async ({ commentId, abort, storyData, depth }) => {
	const MAX_DEPTH = 3
	try {
		const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${commentId}.json`, { signal: abort })
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}
		const comment = await response.json()

		if (!comment) {
			return null
		}

		const userUrl = `https://news.ycombinator.com/user?id=${comment.by}`
		const storyUrl = t`https://news.ycombinator.com/item?id=${storyData.value?.id}`

		const commentsPerPage = 5
		const commentsToShow = signal(depth >= MAX_DEPTH ? 0 : commentsPerPage)
		const childComments = $(() => {
			const _kids = comment.kids
			const _commentsToShow = commentsToShow.value
			return _kids?.slice(0, _commentsToShow) || []
		})

		if (depth >= MAX_DEPTH) {
			depth = 0
		}

		const isDeleted = comment.dead || comment.deleted

		return (R) => (
			<div class="comment-item" class:deleted-comment={isDeleted}>
				<If condition={isDeleted}>
					{() => <div>{comment.dead ? '[moderated]' : '[deleted]'}</div>}
					{() => (
						<>
							<div class="comment-meta">
								by{' '}
								<a href={userUrl} target="_blank">
									{comment.by}
								</a>{' '}
								| {formatTime(comment.time)} |{' '}
								<a href={`https://news.ycombinator.com/reply?id=${comment.id}`} target="_blank">
									reply
								</a>
							</div>
							<div class="comment-text">
								<Parse text={comment.text} parser={addTargetBlankToLinks} />
							</div>
						</>
					)}
				</If>
				<If condition={$(() => comment.kids && comment.kids.length > 0)}>
					{() => (
						<div class="comment-children">
							<If condition={$(() => depth < MAX_DEPTH || commentsToShow.value > 0)}>
								{() => (
									<For entries={childComments}>
										{({ item: kidId }) => (
											<CommentItem
												commentId={kidId}
												abort={abort}
												fallback={CommentFallback}
												catch={ErrorFallback}
												storyData={storyData}
												depth={depth + 1}
											/>
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

const Comments = ({ storyId, initialStoryData }) => {
	const commentsPerPage = 5
	const commentsToShow = signal(commentsPerPage)
	const isLoadingComments = signal(false)
	const storyData = signal(initialStoryData.value || null)
	const isLoadingStory = signal(!initialStoryData.value)
	const storyError = signal(null)

	let lastStoryId = null
	let abortController = null

	onDispose(() => {
		abortController?.abort()
	})

	watch(async () => {
		abortController?.abort()
		abortController = new AbortController()
		if (!storyId.value) {
			// storyData.value = null
			isLoadingStory.value = false
			lastStoryId = storyId.value
			return
		}

		if (!lastStoryId) {
			storyData.value = null
			commentsToShow.value = commentsPerPage
			await tick()
		}

		lastStoryId = storyId.value

		if (initialStoryData.value && initialStoryData.value.id === storyId.value) {
			storyData.value = initialStoryData.value
			isLoadingStory.value = false
			return
		}

		isLoadingStory.value = true
		storyError.value = null
		try {
			const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId.value}.json`, {
				signal: abortController.signal
			})
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}
			const data = await response.json()
			storyData.value = data
		} catch (error) {
			if (error.name === 'AbortError') {
				storyData.value = null
				isLoadingStory.value = false
			} else {
				storyError.value = error
			}
		} finally {
			isLoadingStory.value = false
		}
	})

	const { title, id, by, score, descendants, url, kids, text, time } = derivedExtract(
		storyData,
		'title',
		'id',
		'by',
		'score',
		'descendants',
		'url',
		'kids',
		'text',
		'time'
	)

	const comments = $(() => {
		const [_kids, _commentsToShow] = readAll(kids, commentsToShow)
		return _kids?.slice(0, _commentsToShow) || []
	})

	const commentsUrl = t`https://news.ycombinator.com/item?id=${id}`
	const userUrl = t`https://news.ycombinator.com/user?id=${by}`

	return (R) => (
		<div class="comments-container">
			<If condition={isLoadingStory}>
				{() => <div class="loading">Loading story...</div>}
				{() => (
					<If condition={storyError}>
						{() => <div class="error">Error loading story: {storyError.value.message}</div>}
						{() => (
							<If condition={storyData}>
								{() => (
									<>
										<div class="comments-header">
											<h3>
												<a href={url} target="_blank">
													{title}
												</a>
											</h3>
											<div class="story-meta">
												{score} point{addS(score)} by{' '}
												<a href={userUrl} target="_blank">
													{by}
												</a>
												{' | '}
												<a href={commentsUrl} target="_blank">
													{$(() => descendants.value || '0')} comment{addS(descendants)}
												</a>
												{' | '}
												<span class="time">{formatTime(time)}</span>
											</div>
											<If condition={text}>
												{() => (
													<div class="story-text">
														<Parse text={text} parser={addTargetBlankToLinks} />
													</div>
												)}
											</If>
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
																		storyData={storyData}
																		abort={abortController.signal}
																		depth={0}
																	/>
																)}
															</For>
														)}
														{() => <div class="no-comments">No comments yet.</div>}
													</If>
													<If condition={$(() => commentsToShow.value < kids.value?.length)}>
														{() => (
															<button class="load-more-btn" on:click={() => (commentsToShow.value += commentsPerPage)}>
																Load More ({$(() => kids.value?.length - commentsToShow.value)})
															</button>
														)}
													</If>
												</>
											)}
										</If>
									</>
								)}
								{() => <div class="no-story-selected">Select a story to view comments.</div>}
							</If>
						)}
					</If>
				)}
			</If>
		</div>
	)
}

export default Comments
