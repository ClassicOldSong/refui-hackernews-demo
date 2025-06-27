import { signal, For, If, watch, $ } from 'refui';
import StoryItem from './StoryItem';
import Comments from './Comments';

const App = () => {
    const SECTIONS = {
        "Top": "topstories",
        "New": "newstories",
        "Best": "beststories",
        "Ask": "askstories",
        "Show": "showstories",
        "Jobs": "jobstories"
    };

    // Helper to get section from hash, default to 'topstories'
    const getSectionFromHash = () => {
        const hash = window.location.hash.substring(1); // Remove #
        const section = Object.values(SECTIONS).find(s => s === hash);
        return section || 'topstories';
    };

    // --- State Signals ---
    const allStoryIds = signal([]); // Stores all fetched story IDs for the current section
    const storiesLimit = signal(30); // Number of stories to display
    const currentSection = signal(getSectionFromHash());
    const isLoading = signal(false);
    const selectedStoryId = signal(null);

    // Derived signal for stories currently displayed
    const storyIds = $(() => allStoryIds.value.slice(0, storiesLimit.value));

    // --- Routing Logic ---
    // Update hash when currentSection changes
    watch(() => {
        if (window.location.hash.substring(1) !== currentSection.value) {
            window.location.hash = currentSection.value;
        }
    });

    // Update currentSection when hash changes (e.g., back/forward buttons)
    window.addEventListener('hashchange', () => {
        currentSection.value = getSectionFromHash();
    });

    // --- Data Fetching ---
    async function fetchStoryIds(section) {
        if (!section) return;
        isLoading.value = true;
        allStoryIds.value = []; // Clear previous stories
        storiesLimit.value = 30; // Reset limit when fetching new section
        try {
            const response = await fetch(`https://hacker-news.firebaseio.com/v0/${section}.json`);
            const ids = await response.json();
            allStoryIds.value = ids;
        } catch (error) {
            console.error(`Error fetching ${section} story IDs:`, error);
            allStoryIds.value = []; // Clear stories on error
        } finally {
            isLoading.value = false;
        }
    }

    // --- Initial Setup & Reactivity ---
    watch(() => fetchStoryIds(currentSection.value));

    const StoryFallback = () => (R) => (
        <div class="story story-placeholder">
            <div class="story-title"><a class="placeholder-text"></a></div>
            <div class="story-meta"><span class="placeholder-text"></span></div>
        </div>
    );

    return (R) => (
        <>
            <div class="tabs">
                <h1 class="page-title">HackerNews Top Stories</h1>
                {Object.entries(SECTIONS).map(([name, value]) => (
                    <button 
                        class:active={currentSection.eq(value)}
                        on:click={() => currentSection.value = value}
                    >
                        {name}
                    </button>
                ))}
                <button class="refresh-btn" on:click={() => fetchStoryIds(currentSection.value)} disabled={isLoading}>
                    &#x21bb;
                </button>
            </div>
            <div class="main-layout">
                <div class="story-list">
                    <If condition={isLoading}>
                        {() => <div class="loading">Loading story list...</div>}
                        {() => 
                            <>
                                <For entries={storyIds}>
                                    {({ item: storyId }) => (
                                        <StoryItem 
                                            storyId={storyId} 
                                            fallback={StoryFallback}
                                            onSelect={() => selectedStoryId.value = storyId}
                                            isSelected={selectedStoryId.eq(storyId)}
                                            catch={({ error }) => <div class="story-error">Error: {error.message}</div>}
                                        />
                                    )}
                                </For>
                                <If condition={$(() => storyIds.value.length < allStoryIds.value.length)}>
                                    {() => (
                                        <button
                                            class="load-more-btn"
                                            on:click={() => storiesLimit.value += 30}
                                            disabled={isLoading}
                                        >
                                            Load More
                                        </button>
                                    )}
                                </If>
                            </>
                        }
                    </If>
                </div>
                <div class="comments-panel">
                    <If condition={selectedStoryId}>
                        {(R) => <Comments storyId={selectedStoryId} />}
                    </If>
                </div>
            </div>
        </>
    );
};

export default App;