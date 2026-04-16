# SAT Vocabulary Sprint

Simple static website for a 32-day SAT vocabulary program.

## Files

- `index.html`: page structure
- `styles.css`: visual design and layout
- `app.js`: study flow, progress saving, review logic
- `data.js`: vocabulary content

## Current content

- Days 1-4 are loaded from the worksheet reference.
- Days 5-32 are already scaffolded in the calendar and can be added by extending `window.SAT_VOCAB_DATA.days` in `data.js`.

## How to use

Open `index.html` in a browser.

## How to add a new day

Add another object to the `days` array in `data.js`:

```js
{
  id: 5,
  title: "Day 5",
  focus: "Short summary of the day's theme.",
  words: [
    {
      word: "example",
      sentence: "A full context sentence goes here.",
      choices: ["choice A", "choice B", "choice C", "choice D"],
      answer: 2
    }
  ]
}
```
