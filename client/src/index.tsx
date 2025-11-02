import { render } from "solid-js/web";
import "solid-devtools";
import "./index.css";
import { Router } from "@solidjs/router";
import { routes } from "./router/router";
import { QueryClientProvider } from "@tanstack/solid-query";
import { queryClient } from "./lib/query-client";
import { SolidQueryDevtools } from "@tanstack/solid-query-devtools";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}

render(
  () => (
    <QueryClientProvider client={queryClient}>
      <Router>{routes}</Router>
      {import.meta.env.DEV && (
        <SolidQueryDevtools initialIsOpen={false} position="bottom" />
      )}
    </QueryClientProvider>
  ),
  root!
);
