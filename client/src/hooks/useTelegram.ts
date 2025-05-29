import { useEffect, useState } from "react";

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export function useTelegram() {
  const [tg, setTg] = useState<any>(null);
  const [user, setUser] = useState<TelegramWebAppUser | null>(null);

  useEffect(() => {
    // @ts-ignore
    if (window.Telegram && window.Telegram.WebApp) {
      // @ts-ignore
      setTg(window.Telegram.WebApp);
      // @ts-ignore
      setUser(window.Telegram.WebApp.initDataUnsafe?.user || null);
    }
  }, []);

  return { tg, user };
}
