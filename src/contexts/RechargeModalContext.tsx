import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { QrCode, MessageCircle, CheckCircle2, Copy, Check } from 'lucide-react';

// ─── Context ──────────────────────────────────────────────────────
interface RechargeModalContextValue {
  openRechargeModal: () => void;
}

const RechargeModalContext = createContext<RechargeModalContextValue>({
  openRechargeModal: () => {},
});

export function useRechargeModal() {
  return useContext(RechargeModalContext);
}

// ─── Modal 组件 ────────────────────────────────────────────────────
function RechargeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  // 硬编码兜底，确保二维码始终可见
  const [qrUrl, setQrUrl] = useState('https://miaoda-conversation-file.cdn.bcebos.com/user-bqve9ss1uzgg/app-brhf2ms7ez29/20260525/image.png');
  // 默认回退到已知客服微信号
  const [wechatId, setWechatId] = useState('yy889358');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    supabase
      .from('system_configs')
      .select('key, value')
      .in('key', ['service_contact_qr', 'service_wechat_id'])
      .then(({ data }) => {
        (data ?? []).forEach(r => {
          if (r.key === 'service_contact_qr') setQrUrl(r.value ?? '');
          if (r.key === 'service_wechat_id' && r.value) setWechatId(r.value);
        });
      });
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(wechatId);
    } catch {
      // 兜底：execCommand
      const el = document.createElement('textarea');
      el.value = wechatId;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);

    // 异步打点，不阻塞 UI
    supabase.from('analytics_events').insert({
      user_id: user?.id ?? null,
      event_type: 'copy_wechat_id',
      metadata: { wechat_id: wechatId, source: 'recharge_modal' },
    }).then(({ error }) => {
      if (error) console.warn('analytics insert error:', error.message);
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center">
            <MessageCircle className="w-5 h-5 text-green-500" />
            人工充值
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* 引导文案 */}
          <p className="text-sm text-center text-muted-foreground leading-relaxed">
            为保障资金安全，请添加客服微信进行人工充值，<br />
            我们将为您提供<strong className="text-foreground">专属收款码</strong>，安全到账有保障。
          </p>

          {/* 微信号 + 一键复制 */}
          <div className="flex items-center justify-center gap-2 rounded-xl bg-green-500/8 border border-green-500/20 px-4 py-3">
            <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
              <span className="text-[11px] text-muted-foreground">客服微信号</span>
              <span className="font-mono font-bold text-lg text-foreground select-all tracking-wider">
                {wechatId}
              </span>
            </div>
            <Button
              size="sm"
              onClick={handleCopy}
              className={`shrink-0 gap-1.5 transition-all ${
                copied
                  ? 'bg-green-500 hover:bg-green-500/90 text-white border-0'
                  : 'bg-green-500/10 hover:bg-green-500/20 text-green-600 border border-green-500/30'
              }`}
              variant="outline"
            >
              {copied
                ? <><Check className="w-3.5 h-3.5" /> 已复制</>
                : <><Copy className="w-3.5 h-3.5" /> 一键复制</>
              }
            </Button>
          </div>

          {/* 微信二维码 */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-[230px] h-[230px] rounded-2xl border-2 border-green-500/30 bg-green-500/5 flex items-center justify-center overflow-hidden">
              {qrUrl ? (
                <img src={qrUrl} alt="客服微信二维码" className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <QrCode className="w-12 h-12 opacity-25" />
                  <p className="text-xs px-4 text-center">二维码待配置</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">↑ 扫码或搜索微信号添加客服</p>
          </div>

          {/* 步骤说明 */}
          <div className="space-y-1.5">
            {[
              '添加客服微信（扫码或搜索微信号）',
              '告知充值金额及账号手机号',
              '收到专属收款码后完成转账',
              '积分将在核实后立即到账',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <Button
          className="w-full bg-green-500 hover:bg-green-500/90 border-0 text-white gap-2"
          onClick={onClose}
        >
          <CheckCircle2 className="w-4 h-4" />
          我已添加客服
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Provider ─────────────────────────────────────────────────────
export function RechargeModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openRechargeModal = useCallback(() => setOpen(true), []);

  return (
    <RechargeModalContext.Provider value={{ openRechargeModal }}>
      {children}
      <RechargeModal open={open} onClose={() => setOpen(false)} />
    </RechargeModalContext.Provider>
  );
}
