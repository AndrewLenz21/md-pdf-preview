function getScrollRange(element: HTMLElement) {
  return Math.max(0, element.scrollHeight - element.clientHeight);
}

function syncScrollPosition(source: HTMLElement, target: HTMLElement) {
  const sourceRange = getScrollRange(source);
  const targetRange = getScrollRange(target);
  const progress = sourceRange === 0 ? 0 : source.scrollTop / sourceRange;

  target.scrollTop = progress * targetRange;
}

export function attachDocumentScrollSync(
  left: HTMLElement | null,
  right: HTMLElement | null,
) {
  if (!left || !right) {
    return () => undefined;
  }

  let frame: number | null = null;
  let programmaticScroll: { element: HTMLElement; top: number } | null = null;

  const consumeProgrammaticScroll = (element: HTMLElement) => {
    if (!programmaticScroll || programmaticScroll.element !== element) {
      return false;
    }

    const isExpected = Math.abs(element.scrollTop - programmaticScroll.top) < 2;
    programmaticScroll = null;
    return isExpected;
  };

  const scheduleSync = (source: HTMLElement, target: HTMLElement) => {
    if (frame !== null) {
      window.cancelAnimationFrame(frame);
    }

    frame = window.requestAnimationFrame(() => {
      frame = null;
      syncScrollPosition(source, target);
      programmaticScroll = {
        element: target,
        top: target.scrollTop,
      };
    });
  };

  const handleLeftScroll = () => {
    if (!consumeProgrammaticScroll(left)) {
      scheduleSync(left, right);
    }
  };
  const handleRightScroll = () => {
    if (!consumeProgrammaticScroll(right)) {
      scheduleSync(right, left);
    }
  };

  left.addEventListener("scroll", handleLeftScroll, { passive: true });
  right.addEventListener("scroll", handleRightScroll, { passive: true });

  frame = window.requestAnimationFrame(() => {
    frame = null;
    syncScrollPosition(left, right);
    programmaticScroll = { element: right, top: right.scrollTop };
  });

  return () => {
    left.removeEventListener("scroll", handleLeftScroll);
    right.removeEventListener("scroll", handleRightScroll);
    programmaticScroll = null;

    if (frame !== null) {
      window.cancelAnimationFrame(frame);
    }
  };
}
