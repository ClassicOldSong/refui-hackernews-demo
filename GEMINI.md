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


**Important Notes for this Project:**
*   **Retained Mode Rendering:** rEFui directly manages the DOM based on state, unlike virtual DOM libraries.
*   **Browser Preset:** The project utilizes `refui/browser` for rendering.
*   **Reactivity:** `refui`'s `signal`, `watch`, `For`, and `If` are used for state management and reactive UI updates.
*   **Asynchronous Components:** Components like `StoryItem.jsx` are `async` and handle data fetching directly.
*   **Hacker News API:** Data is sourced from the Hacker News Firebase API.
*   **Vite Build System:** Vite is used for development and building, including Hot Module Replacement (HMR).

---

**rEFui Core Concepts & Usage Summary:**

**1. Signals (Reactivity Core):**
*   **Definition:** Reactive containers (`signal()`) that notify observers on value changes.
*   **Computed Signals:** Derive values from other signals (`computed()`, or `$(...)` alias) and update automatically.
*   **Effects:** Functions (`watch()`) that re-run when their signal dependencies change.
*   **Access:** Use `.value` for read/write. `peek()` reads without creating dependencies.
*   **Important:** In JSX, dynamic expressions depending on signals *must* be wrapped in `$(...)` to be reactive (e.g., `$(() => `Count: ${count.value}`)`). Simple signal references like `{count}` are automatically handled.

**2. Components:**
*   **Structure:** A component is a function `(props, ...children) => (R) => Node`. The inner function receives the renderer `R`.
*   **Built-in Components:**
		*   `<If condition={signal}>`: Conditional rendering.
		*   `<For entries={signalOfArray} track="key">`: Efficiently renders lists with reconciliation. Use `track` for stable keys.
		*   `<Async future={promise}>`: Manages asynchronous operations (pending, resolved, rejected states). `async` components automatically get `fallback` and `catch` props.
		*   `<Dynamic is={componentOrTag}>`: Renders a component or HTML tag that can change dynamically.
		*   `<Fn>`: Executes a function that returns a render function, useful for complex logic.
*   **`$ref` Prop:** Special prop to get a reference to a DOM element or component instance (as a signal or function). **Crucial for HMR in dev mode:** always use `$ref` for component references, not `createComponent()` return values.
*   **`expose()`:** Allows child components to expose properties/methods to their parent via `$ref`.
*   **`capture()`:** Captures the current rendering context, useful for running functions (e.g., `expose()`) after `await` calls in async components.

**3. Renderers:**
*   **Pluggable Architecture:** Decouples component logic from rendering environment.
*   **`createRenderer(nodeOps, rendererID?)`:** Creates a custom renderer.
*   **`createDOMRenderer(defaults)` (`refui/dom`):** For interactive web applications.
		*   **Event Handling:** `on:eventName` (e.g., `on:click`). Supports modifiers like `on-once:`, `on-passive:`, `on-capture:`.
		*   **Attributes/Props:** Automatically handles DOM properties vs. HTML attributes. Use `attr:` prefix for attributes, `prop:` for properties.
		*   **Conditional Classes:** `class:className={signal}` (with browser preset).
*   **`createHTMLRenderer()` (`refui/html`):** For Server-Side Rendering (SSR).
		*   **Output:** Produces static HTML strings via `serialize()`.
		*   **Differences from DOM:** Ignores event handlers, self-closing tags, HTML escaping, signals evaluated once (no client-side reactivity).

**4. JSX Setup:**
*   **Retained Mode:** JSX templates are evaluated once to build the initial UI.
*   **Classic Transform (Recommended):** Provides maximum flexibility. Requires configuring `jsxFactory: 'R.c'` and `jsxFragment: 'R.f'` in build tools (Vite, Babel). Components receive `R` as an argument.
*   **Automatic Runtime:** Easier setup, but less flexible. Configures `jsx: 'automatic'` and `jsxImportSource: 'refui'`. Requires `wrap(R)` initialization.
*   **Hot Module Replacement (HMR):** Use `refurbish` plugin for seamless HMR in development.

**5. Best Practices:**
*   Create renderer instances **once** at the application entry point.
*   Use computed signals for derived data.
*   Dispose of effects when no longer needed (`dispose()` from `watch()`, or `onDispose()`).
*   Use `peek()` to avoid creating unnecessary dependencies.
*   Updates are automatically batched.
*   Use `untrack()` for non-reactive operations.

---

**Additional Notes and Best Practices from Development:**

*   **JSX Children in Control Flow Components:** When using components like `<If>` and `<For>`, ensure their render function children return either a *single root element* or a `Fragment` (`<>...</>`) if rendering multiple sibling elements. This prevents unexpected rendering issues.
*   **Handling Dynamic HTML Content:** For inserting dynamic HTML (e.g., from APIs), prefer parsing the HTML into a `DocumentFragment` and rendering it directly within the component. This is more robust and integrates better with rEFui's retained mode rendering than using `innerHTML` directly, which can have security implications and reconciliation challenges.
*   **`t` Template Literal:** The `t` template literal (e.g., `t`https://news.ycombinator.com/item?id=${id}`) is used for string interpolation, particularly useful for constructing URLs. Its usage ensures proper string formatting within JSX.
*   **Error Handling in Asynchronous Components:** Implement robust error handling within `async` components (like `StoryItem` and `CommentItem`). Utilize the `catch` prop of `<Async>` components and `try...catch` blocks for network requests to gracefully manage and display errors to the user.
*   **Reactivity Pitfalls:** Remember to wrap expressions in `$(...)` within JSX when they need to be reactive. Be mindful of when to use `peek()` or `untrack()` to control signal dependencies and avoid unnecessary re-renders.
*   **Styling Dynamic Elements:** For dynamically styled elements, leverage rEFui's capabilities for conditional classes (e.g., `class:active={signal}`) and inline styles with reactive values to ensure styles update correctly with state changes.

---

## rEFui Documentation (Embedded)

### Signal.md

# Signals

Signals are the core primitive for reactivity in rEFui. They are simple objects that hold a value and notify any observers when that value changes.

## Important notice
Signal effects are semi-lazily computed, that means, no matter how many times you changed the value of a signal, its effects will only be executed once at the end of this tick. So if you modifred a signal's value and want to retrieve its updated derived signals value, you'll need to use `nextTick(cb)` or `await tick()` to get the new value.

## Creating Signals

You can create a signal using the `signal()` function:

```javascript
import { signal } from 'refui';

const count = signal(0);
const name = signal('rEFui');
```

## Accessing and Updating Signal Values

To access the current value of a signal, use its `.value` property. To update a signal, assign a new value to its `.value` property.

```javascript
console.log(count.value); // 0
count.value = 1; // Updates the signal and notifies observers
console.log(count.value); // 1

name.value = 'New Name';
```

## Computed Signals

Computed signals are signals whose values are derived from other signals. They automatically re-evaluate when their dependencies change.

You can create a computed signal using `computed()` or its alias `$`:

```javascript
import { signal, computed, $, nextTick } from 'refui';

const firstName = signal('John');
const lastName = signal('Doe');

const fullName = computed(() => `${firstName.value} ${lastName.value}`);
// Or using the alias:
const greeting = $(() => `Hello, ${firstName.value}!`);

console.log(fullName.value); // "John Doe"
console.log(greeting.value); // "Hello, John!"

firstName.value = 'Jane'; // fullName and greeting will automatically update
nextTick(() => {
	console.log(fullName.value); // "Jane Doe"
})
```

## Effects (`watch`)

Effects are functions that run whenever any of the signals they depend on change. They are created using the `watch()` function.

```javascript
import { signal, watch, nextTick } from 'refui';

const count = signal(0);

watch(() => {
	console.log(`Count changed to: ${count.value}`);
});

count.value = 1; // Logs: "Count changed to: 1"

nextTick(() => {
	count.value = 2; // Logs: "Count changed to: 2"
})
```

Effects are automatically cleaned up when the component they are in is unmounted, or you can manually dispose of them:

```javascript
const dispose = watch(() => {
	// ... effect logic ...
});

dispose(); // Manually stop the effect
```

## `peek()` and `untrack()`

Sometimes you need to read a signal's value without creating a dependency. For this, you can use `peek()`.

`untrack()` allows you to run a block of code without tracking any signal dependencies within that block.

```javascript
import { signal, watch, peek, untrack } from 'refui';

const a = signal(1);
const b = signal(2);

watch(() => {
	console.log('a changed', a.value);
	// Reading b with peek() will not make b a dependency of this watch
	console.log('b (peeked)', peek(b));
});

watch(() => {
	console.log('a and b changed', a.value, b.value);
	untrack(() => {
		// Changes to c will not re-run this watch
		const c = signal(3);
		console.log('c (untracked)', c.value);
	});
});

a.value = 10; // Both watches run
b.value = 20; // Only the second watch runs
```

## Signal Batching

rEFui automatically batches signal updates. This means that if you update multiple signals synchronously, the effects will only run once after all updates have been applied, preventing unnecessary re-renders.

```javascript
import { signal, watch } from 'refui';

const firstName = signal('John');
const lastName = signal('Doe');

watch(() => {
	console.log(`Full Name: ${firstName.value} ${lastName.value}`);
});

// These updates are batched, the watch effect runs only once
firstName.value = 'Jane';
lastName.value = 'Smith';
```

### Components.md

# Components

In rEFui, components are the building blocks of your UI. They are functions that describe a part of your user interface based on their props and internal state.

## Component Structure

A rEFui component is typically a function that takes `props` and `...children` as arguments, and returns another function that takes the `renderer` (`R`) as an argument. This inner function then returns the JSX describing the component's UI.

```javascript
import { signal } from 'refui';

const MyComponent = (props, ...children) => (R) => {
	const count = signal(props.initialCount || 0);

	return (
		<div>
			<p>Count: {count.value}</p>
			<button on:click={() => count.value++}>Increment</button>
			{children} {/* Render children passed to the component */}
		</div>
	);
};

// Usage:
// <MyComponent initialCount={5}><span>Hello</span></MyComponent>
```

## Built-in Components

rEFui provides several built-in components for common UI patterns and control flow.

### `<If>`

Conditionally renders content based on a signal's value.

```javascript
import { signal, If } from 'refui';

const showContent = signal(true);

const MyConditionalComponent = () => (R) => (
	<If condition={showContent}>
		{() => <p>This content is shown.</p>}
		{() => <p>This content is hidden.</p>} {/* Optional else branch */}
	</If>
);

// Toggle visibility:
// showContent.value = false;
```

### `<For>`

Efficiently renders lists of items. It requires an `entries` signal (an array of values) and an optional `track` prop for keying.

```javascript
import { signal, For } from 'refui';

const items = signal([
	{ id: 1, text: 'Item 1' },
	{ id: 2, text: 'Item 2' },
]);

const MyListComponent = () => (R) => (
	<ul>
		<For entries={items} track="id">
			{({ item, index }) => (
				<li>{item.text} (Index: {index})</li>
			)}
		</For>
	</ul>
);

// Add a new item:
// items.value = [...items.value, { id: 3, text: 'Item 3' }];
```

The `track` prop is crucial for efficient reconciliation when the list changes. It should point to a unique identifier for each item.

### `<Async>`

Manages asynchronous operations and renders different content based on the promise's state (pending, resolved, rejected).

```javascript
import { signal, Async } from 'refui';

async function fetchData() {
	const response = await fetch('/api/data');
	if (!response.ok) throw new Error('Failed to fetch data');
	return response.json();
}

const dataPromise = signal(fetchData());

const MyAsyncComponent = () => (R) => (
	<Async future={dataPromise}>
		{() => <p>Loading data...</p>} {/* Pending state */}
		{({ data }) => <p>Data: {data.message}</p>} {/* Resolved state */}
		{({ error }) => <p style="color: red;">Error: {error.message}</p>} {/* Rejected state */}
	</Async>
);

// You can also use async components directly:
const MyAsyncComponentDirect = async () => {
	const data = await fetchData();
	return (R) => <p>Data loaded: {data.message}</p>;
};

// Async components automatically get `fallback` and `catch` props
// <AsyncComponent fallback={LoadingSpinner} catch={ErrorDisplay} />
```

### `<Dynamic>`

Renders a component or an HTML tag that can change dynamically.

```javascript
import { signal, Dynamic } from 'refui';

const TagName = signal('div');

const MyDynamicComponent = () => (R) => (
	<Dynamic is={TagName}>
		<p>This is inside a {TagName.value} tag.</p>
	</Dynamic>
);

// Change the tag:
// TagName.value = 'span';
```

### `<Fn>`

Executes a function that returns a render function. Useful for encapsulating complex logic that needs to run within the rendering context.

```javascript
import { signal, Fn } from 'refui';

const MyFnComponent = () => (R) => (
	<Fn>
		{() => {
			const value = signal(10);
			// Complex logic here
			return (R) => <p>Value from Fn: {value.value}</p>;
		}}
	</Fn>
);
```

## `$ref` Prop

The `$ref` prop is a special prop in rEFui used to get a reference to a DOM element or a component instance. It can accept a signal or a function.

```javascript
import { signal, watch } from 'refui';

const myDivRef = signal(null);

watch(() => {
	if (myDivRef.value) {
		console.log('Div element:', myDivRef.value);
		myDivRef.value.style.backgroundColor = 'lightblue';
	}
});

const MyRefComponent = () => (R) => (
	<div $ref={myDivRef}>This is a div with a ref.</div>
);

// You can also use a function for $ref:
const myButtonRef = (el) => {
	if (el) {
		console.log('Button element:', el);
	}
};

const MyButtonComponent = () => (R) => (
	<button $ref={myButtonRef}>Click me</button>
);
```

**Crucial for HMR in dev mode:** When using Hot Module Replacement (HMR), always use `$ref` for component references instead of directly using the return value of `createComponent()`. This ensures that component instances are correctly updated during HMR.

## `expose()`

Allows a child component to expose properties or methods to its parent component via the `$ref` mechanism.

```javascript
import { signal, watch } from 'refui';

const ChildComponent = (props) => (R) => {
	const internalCount = signal(0);

	// Expose a method and a signal
	R.expose({
		increment: () => internalCount.value++,
		currentCount: internalCount,
	});

	return <p>Child Count: {internalCount.value}</p>;
};

const ParentComponent = () => (R) => {
	const childRef = signal(null);

	watch(() => {
		if (childRef.value) {
			console.log('Child current count:', childRef.value.currentCount.value);
			childRef.value.increment();
		}
	});

	return <ChildComponent $ref={childRef} />;
};
```

## `capture()`

`capture()` is used to capture the current rendering context. This is particularly useful in `async` components where you might need to run functions (like `expose()`) after an `await` call, ensuring they operate within the correct context.

```javascript
import { signal, capture } from 'refui';

const MyAsyncExposeComponent = async () => {
	const data = await new Promise(resolve => setTimeout(() => resolve('Data'), 100));

	// Capture the context before returning the render function
	const captured = capture();

	return (R) => {
		// Use the captured context to expose properties
		captured.R.expose({
			loadedData: signal(data)
		});
		return <p>Async Data: {data}</p>;
	};
};
```

### DOMRenderer.md

# DOM Renderer

The DOM renderer (`refui/dom`) is designed for building interactive web applications that run in a browser environment. It directly manipulates the Document Object Model (DOM) to reflect the state of your rEFui components.

## Creating a DOM Renderer

You typically create a DOM renderer instance once at the entry point of your application:

```javascript
import { createDOMRenderer } from 'refui/dom';

const R = createDOMRenderer();

// Then mount your root component:
// R.render(<App />, document.getElementById('app'));
```

You can also pass default options to `createDOMRenderer`:

```javascript
const R = createDOMRenderer({
	// Custom element creation, e.g., for SVG or custom elements
	createElement(tag, props, children) {
		if (tag === 'svg') {
			return document.createElementNS('http://www.w3.org/2000/svg', tag);
		}
		return document.createElement(tag);
	},
});
```

## Event Handling

rEFui's DOM renderer provides a declarative way to handle DOM events using the `on:` prefix in JSX.

```javascript
<button on:click={() => console.log('Button clicked!')}>Click Me</button>
```

### Event Modifiers

You can use event modifiers to change the behavior of event listeners:

*   `on-once:eventName`: The event listener will be called at most once.
		```javascript
		<button on-once:click={() => console.log('Clicked only once')}>Click Once</button>
		```
*   `on-passive:eventName`: Marks the listener as passive, improving scroll performance. Useful for `scroll`, `wheel`, `touchstart`, `touchmove`.
		```javascript
		<div on-passive:scroll={() => console.log('Scrolling passively')}>...</div>
		```
*   `on-capture:eventName`: Attaches the event listener in the capture phase.
		```javascript
		<div on-capture:click={() => console.log('Clicked (capture)')}>
			<button on:click={() => console.log('Clicked (bubble)')}>Inner Button</button>
		</div>
		```
*   `on-prevent:eventName`: Calls `event.preventDefault()` automatically.
		```javascript
		<a href="#" on-prevent:click={() => console.log('Prevented default')}>Link</a>
		```
*   `on-stop:eventName`: Calls `event.stopPropagation()` automatically.
		```javascript
		<div on:click={() => console.log('Parent')}>
			<button on-stop:click={() => console.log('Child (stopped propagation)')}>Child Button</button>
		</div>
		```

## Attributes and Properties

rEFui intelligently handles whether to set an attribute or a property on a DOM element. For most standard HTML attributes (like `id`, `class`, `src`), it will set them as properties when appropriate. For custom attributes or when you explicitly need to set an attribute, you can use the `attr:` prefix.

```javascript
<div id="my-id" class="my-class" data-custom="value"></div>
// Sets id and class as properties, data-custom as an attribute

<input type="text" prop:value={mySignal} /> {/* Sets the value property */}
<div attr:aria-label="My Label"></div> {/* Sets the aria-label attribute */}
```

### Conditional Classes

With the browser preset, you can easily apply conditional classes based on a signal's value using the `class:` prefix.

```javascript
import { signal } from 'refui';

const isActive = signal(true);

const MyComponent = () => (R) => (
	<div class:active={isActive} class:highlight={$(() => isActive.value && someOtherSignal.value)}>
		Content
	</div>
);

// If isActive.value is true, class="active" is added.
// If the computed signal for highlight is true, class="highlight" is added.
```

### JSX.md

# JSX in rEFui

rEFui uses JSX (JavaScript XML) for defining UI structures. JSX allows you to write HTML-like syntax directly within your JavaScript code, which is then transformed into JavaScript function calls.

## JSX Transform

There are two main ways to configure the JSX transform for rEFui:

### 1. Classic Transform (Recommended)

This is the recommended approach for maximum flexibility and control. With the classic transform, your JSX is transformed into calls to `jsxFactory` and `jsxFragment` functions.

**Configuration (e.g., in `vite.config.js` for Vite, or Babel config):**

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
	esbuild: {
		jsxFactory: 'R.c',
		jsxFragment: 'R.f',
	},
	// ... other Vite config
});
```

**How it works:**

When you write JSX like this:

```javascript
const MyComponent = (props) => (R) => (
	<div>
		<p>Hello</p>
		{props.children}
	</div>
);
```

It gets transformed into something similar to:

```javascript
const MyComponent = (props) => (R) => (
	R.c('div', null, R.c('p', null, 'Hello'), props.children)
);
```

**Key points for Classic Transform:**
*   Your component functions receive the `renderer` instance (`R`) as an argument. This `R` object contains the `c` (createElement) and `f` (createFragment) functions.
*   You have explicit control over how elements and fragments are created.

### 2. Automatic Runtime

This approach is simpler to set up as it doesn't require explicitly passing the `renderer` (`R`) to every component. However, it offers less flexibility.

**Configuration (e.g., in `vite.config.js` for Vite, or Babel config):**

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
	esbuild: {
		jsx: 'automatic',
		jsxImportSource: 'refui', // This tells the runtime where to import jsx-runtime functions from
	},
	// ... other Vite config
});
```

**How it works:**

With automatic runtime, the JSX transform automatically imports `jsx` and `jsx-runtime` functions from the specified `jsxImportSource`.

```javascript
// Your component
const MyComponent = (props) => (
	<div>
		<p>Hello</p>
		{props.children}
	</div>
);

// Internally, this might be transformed to something like:
import { jsx, jsxs, Fragment } from 'refui/jsx-runtime';

const MyComponent = (props) => (
	jsx('div', { children: [jsx('p', { children: 'Hello' }), props.children] })
);
```

**Initialization with Automatic Runtime:**

When using the automatic runtime, you need to initialize the renderer by wrapping your root component with `wrap(R)`:

```javascript
import { createDOMRenderer } from 'refui/dom';
import { wrap } from 'refui';
import App from './App';

const R = createDOMRenderer();

R.render(wrap(R)(<App />), document.getElementById('app'));
```

## Hot Module Replacement (HMR)

For seamless Hot Module Replacement (HMR) in development mode, especially with Vite, you should use the `refurbish` plugin.

**Installation:**

```bash
npm install -D refurbish
# or
yarn add -D refurbish
# or
pnpm add -D refurbish
```

**Configuration (e.g., `vite.config.js`):**

```javascript
import { defineConfig } from 'vite';
import refurbish from 'refurbish/vite';

export default defineConfig({
	plugins: [refurbish()],
	esbuild: {
		jsxFactory: 'R.c',
		jsxFragment: 'R.f',
	},
});
```

**Important for HMR:** When referencing components or DOM elements that need to be updated by HMR, always use the `$ref` prop instead of directly storing the return value of `createComponent()` or `R.c()` calls. This allows `refurbish` to correctly update the instances.

```javascript
import { signal } from 'refui';

const MyComponent = () => (R) => {
	const myDiv = signal(null);

	// Correct for HMR:
	return <div $ref={myDiv}>Hello</div>;

	// Incorrect for HMR (will lose state on update):
	// const divElement = R.c('div', null, 'Hello');
	// return divElement;
};
```

### GetStarted.md

# Getting Started with rEFui

This guide will help you set up a basic rEFui project.

## 1. Installation

First, you need to install rEFui and a compatible build tool (like Vite for development).

```bash
npm install refui
# or
yarn add refui
# or
pnpm add refui

npm install -D vite
# or
yarn add -D vite
# or
pnpm add -D vite
```

## 2. Project Setup (Vite Example)

Create a new Vite project or integrate rEFui into an existing one.

### `index.html`

Your `index.html` will be the entry point for your application.

```html
<!DOCTYPE html>
<html lang="en">
<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>rEFui App</title>
</head>
<body>
		<div id="app"></div>
		<script type="module" src="/src/main.js"></script>
</body>
</html>
```

### `vite.config.js`

Configure Vite to use the classic JSX transform, which is recommended for rEFui.

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
	esbuild: {
		jsxFactory: 'R.c',
		jsxFragment: 'R.f',
	},
});
```

### `src/main.js` (Entry Point)

This is where you'll initialize the DOM renderer and mount your root component.

```javascript
import { createDOMRenderer } from 'refui/dom';
import App from './App'; // Your root component

const R = createDOMRenderer();

R.render(<App />, document.getElementById('app'));
```

### `src/App.js` (Root Component Example)

Create your first rEFui component.

```javascript
import { signal } from 'refui';

const App = () => (R) => {
	const count = signal(0);

	return (
		<div>
			<h1>Hello, rEFui!</h1>
			<p>Count: {count.value}</p>
			<button on:click={() => count.value++}>Increment</button>
		</div>
	);
};

export default App;
```

## 3. Running the Application

Add a `dev` script to your `package.json`:

```json
{
	"name": "my-refui-app",
	"private": true,
	"version": "0.0.0",
	"type": "module",
	"scripts": {
		"dev": "vite",
		"build": "vite build",
		"preview": "vite preview"
	},
	"dependencies": {
		"refui": "^0.1.0"
	},
	"devDependencies": {
		"vite": "^5.0.0"
	}
}
```

Then, run:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Your rEFui application should now be running in your browser!

## Next Steps

*   Explore [Signals](link-to-signals-doc) for managing state.
*   Learn about [Components](link-to-components-doc) and their lifecycle.
*   Understand [DOM Renderer](link-to-dom-renderer-doc) specifics like event handling.
*   Dive deeper into [JSX usage](link-to-jsx-doc).

```
