rEFui is a **retained mode** renderer, you need to understand its difference with React. It works like Solid.js, but has some differences in detail.

For this project, the DOM renderer and Browser preset is used.

Follow the code style in @.editorconfig :

```ini
[*]
charset = utf-8
indent_style = tab
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[package.json]
indent_style = space

[.eslintrc]
indent_style = space

[.prettierrc]
indent_style = space
```

Use `pnpm build` to check potential build errors, as `pnpm dev` spawns a blocking dev server.

Please note, build success doesn't mean no runtime issues. Check carefully if you have made any existing variables disappear during the edit, or the new variables has not been declared.

## AI contribution rules (apply to every task)

1. Preserve existing code style, indentation, variable names, resource naming, and line endings; never re-format unrelated code.
2. Make the smallest possible change set that fully addresses the task; do not touch out-of-scope files.
3. **No extra comments**: do not introduce or translate comments unless explicitly asked.
4. Fix root causes rather than masking symptoms; avoid defensive checks unless requested.
5. Do not change public APIs or existing functionality unless required by the task.
6. **THIS IS NOT A REACT PROJECT**: Do not write React code, hooks, or JSX patterns. This uses rEFui with different patterns and concepts.

**Important Notes for this Project:**
*   **Retained Mode Rendering:** rEFui directly manages the DOM based on state, unlike virtual DOM libraries.
*   **Browser Preset:** The project utilizes `refui/dom` with `refui/browser` preset for rendering.
*   **Reactivity:** `refui`'s `signal`, `computed`/`$`, `watch`, `For`, and `If` are used for state management and reactive UI updates.
*   **Asynchronous Components:** Components like `StoryItem.jsx` are `async` and handle data fetching directly.
*   **Hacker News API:** Data is sourced from the Hacker News Firebase API.
*   **Vite Build System:** Vite is used for development and building, including Hot Module Replacement (HMR).

---

**rEFui Core Concepts & Usage Summary:**

**1. Signals (Reactivity Core):**
*   **Definition:** Reactive containers (`signal()`) that notify observers on value changes.
*   **Computed Signals:** Derive values from other signals (`computed()`, or `$(...)` alias) and update automatically.
*   **Effects:** Functions (`watch()` or `useEffect()`) that re-run when their signal dependencies change.
*   **Access:** Use `.value` for read/write. `peek()` reads without creating dependencies.
*   **Signal Batching:** Updates are automatically batched - effects only run once per tick.
*   **Important:** In JSX, dynamic expressions depending on signals *must* be wrapped in `$(...)` to be reactive (e.g., `$(() => \`Count: ${count.value}\`)`). Simple signal references like `{count}` are automatically handled.
*   **One-off combined condition:** You don't need to wrap static combined conditions in `$(...)` if they're only used one-off, and don't change in the future. Like when a condition doesn't include any signal dependencies.

**Signal Operations:**
*   **Utility Functions:** `read()`, `write()`, `readAll()`, `poke()`, `touch()` for safe signal manipulation
*   **Logical Operations:** `.and()`, `.or()`, `.andNot()`, `.orNot()`, `.inverse()`, `.inverseAnd()`, etc.
*   **Comparisons:** `.eq()`, `.neq()`, `.gt()`, `.lt()`
*   **Conditional:** `.nullishThen()`, `.hasValue()`
*   **Advanced:** `merge()`, `derive()`, `extract()`, `tpl\`...\``, `not()`, `onCondition()`

Note: hasValue returns plain boolean. Returns true when the value of the signal is not nullish.

**2. Components:**
*   **Structure:** A component is a function `(props, ...children) => (R) => Node`. The inner function receives the renderer `R`.
*   **Built-in Components:**
		*   `<If condition={signal}>`: Conditional rendering. Supports `true` and `else` props. For one-off static conditions, you can use inline JS to return the desired branch directly just like in React(but will not have reactivity).
		*   `<For entries={signalOfArray} track="key" indexed={true}>`: Efficiently renders lists with reconciliation. Use `track` for stable keys. Exposes `getItem()`, `remove()`, `clear()` methods.
		*   `<Async future={promise}>`: Manages asynchronous operations (pending, resolved, rejected states). `async` components automatically get `fallback` and `catch` props.
		*   `<Dynamic is={componentOrTag}>`: Renders a component or HTML tag that can change dynamically.
		*   `<Fn ctx={value} catch={errorHandler}>`: Executes a function that returns a render function, useful for complex logic with error boundaries.
*   **`$ref` Prop:** Special prop to get a reference to a DOM element or component instance (as a signal or function). **Critical for HMR in dev mode:** always use `$ref` for component references, not `createComponent()` return values.
*   **`expose()`:** Allows child components to expose properties/methods to their parent via `$ref`.
*   **`capture()`:** Captures the current rendering context, useful for running functions (e.g., `expose()`) after `await` calls in async components.

**3. Renderers:**
*   **Pluggable Architecture:** Decouples component logic from rendering environment.
*   **`createRenderer(nodeOps, rendererID?)`:** Creates a custom renderer.
*   **`createDOMRenderer(defaults)` (`refui/dom`):** For interactive web applications.
		*   **Event Handling:** `on:eventName` (e.g., `on:click`). Supports modifiers like `on-once:`, `on-passive:`, `on-capture:`, `on-prevent:`, `on-stop:`.
		*   **Attributes/Props:** Automatically handles DOM properties vs. HTML attributes. Use `attr:` prefix for attributes, `prop:` for properties.
		*   **Browser Preset Directives:** `class:className={signal}` for conditional classes, `style:property={value}` for individual CSS properties.
*   **`createHTMLRenderer()` (`refui/html`):** For Server-Side Rendering (SSR).
		*   **Output:** Produces static HTML strings via `serialize()`.
		*   **Differences from DOM:** Ignores event handlers, self-closing tags, HTML escaping, signals evaluated once (no client-side reactivity).

**4. JSX Setup:**
*   **Retained Mode:** JSX templates are evaluated once to build the initial UI.
*   **Classic Transform (Recommended):** Provides maximum flexibility. Requires configuring `jsxFactory: 'R.c'` and `jsxFragment: 'R.f'` in build tools (Vite, Babel). Components receive `R` as an argument.
*   **Automatic Runtime:** Easier setup, but less flexible. Configures `jsx: 'automatic'` and `jsxImportSource: 'refui'`. Requires `wrap(R)` initialization.
*   **Hot Module Replacement (HMR):** Use `refurbish` plugin for seamless HMR in development.

**5. Component APIs:**
*   **`createComponent(template, props?, ...children)`:** Creates component instances
*   **`render(instance, renderer)`:** Renders component instances
*   **`dispose(instance)`:** Cleans up component resources
*   **`getCurrentSelf()`:** Gets current component instance
*   **`snapshot()`:** Creates context snapshots for async operations

**6. Best Practices:**
*   Create renderer instances **once** at the application entry point.
*   Use computed signals (`$()`) for derived data and reactive expressions in JSX.
*   Dispose of effects when no longer needed (`dispose()` from `watch()`, or `onDispose()`).
*   Use `peek()` to avoid creating unnecessary dependencies.
*   Updates are automatically batched.
*   Use `untrack()` for non-reactive operations.
*   Use `watch()` for effects without returning cleanup functions.
*   `useEffect()` handles cleanup automatically and passes additional arguments to the effect.
*   Always use `$ref` for component references in development with HMR.

---

**Additional Notes and Best Practices from Development:**

*   **JSX Children in Control Flow Components:** When using components like `<If>` and `<For>`, ensure their render function children return either a *single root element* or a `Fragment` (`<>...</>`) if rendering multiple sibling elements. This prevents unexpected rendering issues.
*   **Handling Dynamic HTML Content:** For inserting dynamic HTML (e.g., from APIs), prefer parsing the HTML into a `DocumentFragment` and rendering it directly within the component. This is more robust and integrates better with rEFui's retained mode rendering than using `innerHTML` directly, which can have security implications and reconciliation challenges.
*   **Template Literals:** Use `tpl\`...\`` for reactive template strings or the simple template literal \`...\` for string interpolation in URLs.
*   **Error Handling in Asynchronous Components:** Implement robust error handling within `async` components. Utilize the `catch` prop of `<Async>` components or direct `fallback`/`catch` props on async components, and `try...catch` blocks for network requests to gracefully manage and display errors to the user.
*   **Reactivity Pitfalls:** Remember to wrap expressions in `$(...)` within JSX when they need to be reactive. Be mindful of when to use `peek()` or `untrack()` to control signal dependencies and avoid unnecessary re-renders.
*   **Styling Dynamic Elements:** For dynamically styled elements, leverage rEFui's browser preset capabilities for conditional classes (`class:active={signal}`) and inline styles (`style:color={signal}`) to ensure styles update correctly with state changes.
*   **Signal Operations:** Use the extensive signal operation methods (`.and()`, `.eq()`, `.gt()`, etc.) for cleaner conditional logic instead of complex computed signals.
*   **List Management:** Use `For` component's exposed methods (`getItem()`, `remove()`, `clear()`) for imperative list manipulation when needed.

---

## rEFui Documentation Reference

**Core Signal APIs:**
- `signal(value)`, `computed(fn)`, `$(fn)` - Creating signals
- `watch(effect)`, `useEffect(effect, ...args)` - Effects with lifecycle
- `read(value)`, `write(signal, value)`, `peek(value)`, `poke(signal, value)` - Utilities
- Signal methods: `.and()`, `.or()`, `.eq()`, `.gt()`, `.inverse()`, `.nullishThen()`, `.hasValue()`
- Advanced: `merge()`, `derive()`, `extract()`, `tpl\`...\``, `not()`, `onCondition()`

Note: hasValue returns plain boolean. Returns true when the value of the signal is not nullish.

**Component APIs:**
- `createComponent()`, `render()`, `dispose()` - Component lifecycle
- `expose()`, `capture()`, `snapshot()`, `getCurrentSelf()` - Context management
- `onDispose()` - Cleanup registration

**Built-in Components:**
- `<If condition={} true={} else={}>` - Conditional rendering
- `<For entries={} track="" indexed={}>` - List rendering with reconciliation
- `<Async future={} fallback={} catch={}>` - Promise handling
- `<Dynamic is={}>` - Dynamic component/tag rendering
- `<Fn ctx={} catch={}>` - Function execution with error boundaries

**Renderer Setup:**
- `createDOMRenderer(defaults)` from `refui/dom`
- `defaults` from `refui/browser` for browser preset with `class:` and `style:` directives
- Event handling: `on:event`, `on-once:event`, `on-passive:event`, `on-capture:event`
- Attributes: `attr:name`, `prop:name`, automatic detection for most cases

**JSX Configuration (Vite):**
```javascript
export default defineConfig({
	esbuild: {
		jsxFactory: 'R.c',
		jsxFragment: 'R.f',
	},
});
```

**HMR Setup:**
```javascript
import refurbish from 'refurbish/vite';
export default defineConfig({
	plugins: [refurbish()],
	// ... jsx config
});
```

---

## ⚠️ CRITICAL: THIS IS NOT REACT!

**DO NOT write React code in this project.** rEFui has fundamentally different patterns:

### Key Differences from React:

| React | rEFui |
|-------|-------|
| `useState(0)` | `signal(0)` |
| `useEffect(() => {}, [deps])` | `watch(() => {})` or `useEffect(() => {})` |
| `{count}` | `{count}` (same for signals) |
| `{`Count: ${count}`}` | `{$(() => \`Count: ${count.value}\`)}` or `{t\`Count: ${count}\`}` |
| `className={isActive ? 'active' : ''}` | `class:active={isActive}` |
| `onClick={() => {}}` | `on:click={() => {}}` |
| Components are functions | Components return functions `(props) => (R) => JSX` |
| Virtual DOM re-renders | Retained mode, direct DOM updates |
| Conditional: `{condition && <div/>}` | `<If condition={signal}>{() => <div/>}</If>` |
| Reactive Lists: `{items.map(item => <div key={item.id}/>)}` | `<For entries={items} track="id">{({item}) => <div/>}</For>` |

---

## rEFui Usage Examples (From This Project)

### 1. Basic Component with State
```javascript
// ❌ React way - DON'T DO THIS
const Counter = () => {
	const [count, setCount] = useState(0)
	return <div onClick={() => setCount(count + 1)}>Count: {count}</div>
}

// ✅ rEFui way - DO THIS
const Counter = () => {
	const count = signal(0)
	return (R) => (
		<div on:click={() => count.value++}>Count: {count}</div>
	)
}
```

### 2. Conditional Rendering
```javascript
// ❌ React way - DON'T DO THIS
const App = () => {
	const [isVisible, setIsVisible] = useState(true)
	return (
		<div>
			{isVisible && <div>Visible content</div>}
			<button onClick={() => setIsVisible(!isVisible)}>Toggle</button>
		</div>
	)
}

// ✅ rEFui way - DO THIS
const App = () => {
	const isVisible = signal(true)
	return (R) => (
		<div>
			<If condition={isVisible}>
				{() => <div>Visible content</div>}
			</If>
			<button on:click={() => isVisible.value = !isVisible.value}>Toggle</button>
		</div>
	)
}
```

### 3. List Rendering
```javascript
// ❌ React way - DON'T DO THIS
const TodoList = () => {
	const [todos, setTodos] = useState([{id: 1, text: 'Learn React'}])
	return (
		<ul>
			{todos.map(todo => (
				<li key={todo.id}>{todo.text}</li>
			))}
		</ul>
	)
}

// ✅ rEFui way - DO THIS
const TodoList = () => {
	const todos = signal([{id: 1, text: 'Learn rEFui'}])
	return (R) => (
		<ul>
			<For entries={todos} track="id">
				{({item}) => <li>{item.text}</li>}
			</For>
		</ul>
	)
}
```

### 4. Effects and Cleanup
```javascript
// ❌ React way - DON'T DO THIS
useEffect(() => {
	const handler = () => console.log('resize')
	window.addEventListener('resize', handler)
	return () => window.removeEventListener('resize', handler)
}, [])

// ✅ rEFui way - DO THIS
useEffect(() => {
	const handler = () => console.log('resize')
	window.addEventListener('resize', handler)
	return () => window.removeEventListener('resize', handler)
})
```

### 5. Conditional Classes
```javascript
// ❌ React way - DON'T DO THIS
<button className={isActive ? 'btn active' : 'btn'}>

// ✅ rEFui way - DO THIS
<button class="btn" class:active={isActive}>
```

### 6. Complex Reactive Expressions
```javascript
// ❌ React way - DON'T DO THIS
const message = `Count is: ${count}`

// ✅ rEFui way - DO THIS
const message = $(() => `Count is: ${count.value}`)
// or inline:
<div>{t`Count is: ${count}`}</div>
```

### 7. Async Components (This Project Pattern)
```javascript
// ✅ rEFui async component pattern
const StoryItem = async ({ storyId }) => {
	const response = await fetch(`/api/story/${storyId}`)
	const story = await response.json()

	return (R) => (
		<div class="story">
			<h3>{story.title}</h3>
			<p>By {story.author}</p>
		</div>
	)
}

// Usage with error handling
<StoryItem
	storyId={123}
	fallback={() => <div>Loading...</div>}
	catch={({error}) => <div>Error: {error.message}</div>}
/>
```

### 8. Signal Operations (Advanced)
```javascript
// Signal comparisons and operations
const count = signal(5)
const isPositive = count.gt(0)          // count > 0
const isZero = count.eq(0)              // count === 0
const isEven = count.and(count.mod(2).eq(0)) // count && count % 2 === 0

// Conditional matching
const status = signal('loading')
const matchStatus = onCondition(status)
const isLoading = matchStatus('loading')
const isError = matchStatus('error')

// Derived properties
const user = signal({name: 'John', age: 30})
const {name, age} = derivedExtract(user, 'name', 'age')
```

### 9. Event Handling with Modifiers
```javascript
// Different event modifiers
<button on:click={() => console.log('normal')}>Click</button>
<button on-once:click={() => console.log('only once')}>Click Once</button>
<div on-passive:scroll={() => console.log('passive scroll')}>Scrollable</div>
<a href="#" on-prevent:click={() => console.log('prevented')}>Link</a>
```

### 10. Template Literals for URLs
```javascript
// Template literals with reactive interpolation
const storyId = signal(123)
const commentsUrl = t`https://news.ycombinator.com/item?id=${storyId}`
```

---

## Common Patterns in This Project

1. **Component Structure**: `const MyComponent = (props) => (R) => <JSX/>`
2. **State**: `const state = signal(initialValue)`
3. **Computed Values**: `const computed = $(() => state.value * 2)`
4. **Effects**: `watch(() => { /* reactive code */ })`
5. **Cleanup**: `useEffect(() => { /* setup */; return () => { /* cleanup */ } })`
6. **Conditional Classes**: `class:active={isActive}`
7. **Lists**: `<For entries={items} track="id">{({item}) => <Item data={item}/>}</For>`
8. **Conditions**: `<If condition={show}>{() => <Content/>}</If>`
9. **Async**: Components can be `async` functions with `fallback` and `catch` props
10. **Signal Operations**: Use `.eq()`, `.gt()`, `.and()`, etc. for comparisons
