export default defineAppConfig({
  ui: {
    colors: {
      primary: "blue",
      neutral: "zinc",
    },
    modal: {
      variants: {
        fullscreen: {
          false: {
            content: "w-[60vw] max-w-none rounded-lg shadow-lg ring ring-default",
          },
        },
      },
    },
  },
});
