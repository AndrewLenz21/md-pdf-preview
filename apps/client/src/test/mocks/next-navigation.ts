export function useRouter() {
  return {
    push: () => {},
    replace: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: () => {},
  };
}

export function usePathname() {
  return "/";
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function useParams() {
  return {};
}

export function redirect() {
  throw new Error("next/navigation redirect is not available in tests");
}

export function permanentRedirect() {
  throw new Error("next/navigation permanentRedirect is not available in tests");
}
