export const SITE_URL = 'https://bbangchul.github.io/ktrp-tennis-rating/';

export function bindLinkShare(root = document, browser = navigator) {
  const button = root.querySelector('#shareLink');
  const status = root.querySelector('#linkShareStatus');
  const fallback = root.querySelector('#shareLinkFallback');
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = '';
    fallback.hidden = true;
    const copy = async () => {
      if (!browser.clipboard?.writeText) throw Error('clipboard unavailable');
      await browser.clipboard.writeText(SITE_URL);
      status.textContent = '링크를 복사했어요. 원하는 곳에 붙여넣어 공유하세요.';
    };
    try {
      if (browser.share) {
        try {
          await browser.share({ title: 'KTRP · 나의 테니스 레벨', text: '내 테니스 레벨은? KTRP 설문으로 확인해보세요.', url: SITE_URL });
          status.textContent = '공유 메뉴를 닫았습니다.';
        } catch (error) {
          if (error.name === 'AbortError') return;
          await copy();
        }
      } else await copy();
    } catch {
      fallback.hidden = false;
      status.textContent = '자동 복사를 사용할 수 없어요. 아래 링크를 길게 누르거나 선택해서 복사하세요.';
    } finally { button.disabled = false; }
  });
}
