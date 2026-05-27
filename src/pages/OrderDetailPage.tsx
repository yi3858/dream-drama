import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle2, Clock, XCircle, RefreshCw, ArrowLeft,
  QrCode, Crown, Star, AlertCircle,
} from 'lucide-react';

interface Order {
  id: string;
  order_no: string;
  amount: number;
  credits: number;
  status: string;
  order_type: string;
  pay_method: string;
  wechat_pay_url: string | null;
  remark: string | null;
  paid_at: string | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:          { label: '待支付',   color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',    icon: Clock },
  paid:             { label: '已支付',   color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  completed:        { label: '已完成',   color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  cancelled:        { label: '已取消',   color: 'bg-muted text-muted-foreground border-border',            icon: XCircle },
  failed:           { label: '支付失败', color: 'bg-destructive/15 text-destructive border-destructive/30', icon: XCircle },
  refunded:         { label: '已退款',   color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',        icon: RefreshCw },
  partial_refunded: { label: '部分退款', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',        icon: RefreshCw },
};

export default function OrderDetailPage() {
  const { orderNo } = useParams<{ orderNo: string }>();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRefreshedRef = useRef(false);

  const fetchOrder = async () => {
    if (!orderNo || !user) return;
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('order_no', orderNo)
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (data) {
      setOrder(data as Order);
      
      // 检查是否超时 (超过 30 分钟未支付)
      if (data.status === 'pending') {
        const expireTime = new Date(data.created_at).getTime() + 30 * 60 * 1000;
        if (Date.now() > expireTime) {
          setIsTimeout(true);
          return data;
        }
      }
    }
    setLoading(false);
    return data;
  };

  // 轮询：每 2s 查询订单状态，直到不再是 pending
  useEffect(() => {
    fetchOrder();
    pollRef.current = setInterval(async () => {
      const data = await fetchOrder();
      
      let currentTimeout = false;
      if (data?.status === 'pending') {
         const expireTime = new Date(data.created_at).getTime() + 30 * 60 * 1000;
         if (Date.now() > expireTime) {
            currentTimeout = true;
            setIsTimeout(true);
         }
      }

      if (data && (data.status !== 'pending' || currentTimeout)) {
        clearInterval(pollRef.current!);
        // 支付成功后刷新用户 profile（更新代理等级）
        if ((data.status === 'paid' || data.status === 'completed') && !hasRefreshedRef.current) {
          hasRefreshedRef.current = true;
          await refreshProfile();
          setCountdown(3);
        }
      }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [orderNo, user]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      const isAgent = order?.order_type === 'agent_fee';
      navigate(isAgent ? '/profile/promote' : '/profile/orders', { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown(c => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate, order]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-lg">
        <Skeleton className="h-8 w-40 mb-6" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-lg text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-lg font-medium mb-2">订单不存在</p>
        <p className="text-sm text-muted-foreground mb-6">请确认订单号是否正确，或返回重新发起</p>
        <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />返回</Button>
      </div>
    );
  }

  const effectiveStatus = isTimeout && order.status === 'pending' ? 'failed' : order.status;
  const statusInfo = STATUS_MAP[effectiveStatus] ?? STATUS_MAP['pending'];
  const StatusIcon = statusInfo.icon;
  const isAgentFee = order.order_type === 'agent_fee';
  const isAgent1 = (order.remark ?? '').includes('一级代理');
  const AgentIcon = isAgent1 ? Crown : Star;

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      {/* 返回 */}
      <Button variant="ghost" className="mb-6 gap-2 text-muted-foreground hover:text-foreground px-0"
        onClick={() => navigate(isAgentFee ? '/agent' : '/profile/orders')}>
        <ArrowLeft className="w-4 h-4" /> 返回
      </Button>

      <Card className="border-2 overflow-hidden">
        {/* 顶部状态栏 */}
        <div className={`px-6 py-4 flex items-center gap-3 border-b border-border/50 ${
          effectiveStatus === 'pending' ? 'bg-amber-500/5' :
          effectiveStatus === 'paid' || effectiveStatus === 'completed' ? 'bg-emerald-500/5' : 
          effectiveStatus === 'failed' || effectiveStatus === 'cancelled' ? 'bg-destructive/5' : 'bg-muted/30'
        }`}>
          <StatusIcon className={`w-5 h-5 ${effectiveStatus === 'failed' || effectiveStatus === 'cancelled' ? 'text-destructive' : ''}`} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-balance">{isTimeout && order.status === 'pending' ? '支付超时' : statusInfo.label}</p>
            <p className="text-xs text-muted-foreground">订单号 {order.order_no}</p>
          </div>
          <Badge className={`text-xs border ${statusInfo.color}`}>{isTimeout && order.status === 'pending' ? '支付超时' : statusInfo.label}</Badge>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* 待支付：显示二维码或H5跳转按钮 */}
          {effectiveStatus === 'pending' && order.wechat_pay_url && (
            <div className="text-center space-y-4">
              {order.wechat_pay_url.startsWith('http') ? (
                <>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
                    <span>请点击下方按钮跳转至微信完成支付</span>
                  </div>
                  <Button 
                    className="w-full max-w-xs bg-[#09B83E] hover:bg-[#08a336] text-white py-6 text-lg rounded-full" 
                    onClick={() => window.location.href = order.wechat_pay_url!}
                  >
                    跳转微信支付
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <QrCode className="w-4 h-4" />
                    <span>微信扫码完成支付</span>
                  </div>
                  <div className="flex justify-center">
                    <div className="p-3 bg-white rounded-2xl shadow-md inline-block">
                      <QRCodeDataUrl
                        text={order.wechat_pay_url}
                        width={200}
                        color="#000000"
                        backgroundColor="#ffffff"
                      />
                    </div>
                  </div>
                </>
              )}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                正在等待支付确认…
              </div>
            </div>
          )}

          {/* 已支付：成功提示 */}
          {(effectiveStatus === 'paid' || effectiveStatus === 'completed') && (
            <div className="text-center space-y-3 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="font-semibold text-lg">支付成功</p>
              {countdown !== null && (
                <p className="text-sm text-muted-foreground">{countdown} 秒后自动跳转...</p>
              )}
              {isAgentFee && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <AgentIcon className="w-4 h-4" />
                  {isAgent1 ? '一级代理资格已开通' : '二级代理资格已开通'}
                </div>
              )}
              {order.paid_at && (
                <p className="text-xs text-muted-foreground">
                  支付时间：{new Date(order.paid_at).toLocaleString('zh-CN')}
                </p>
              )}
            </div>
          )}

          {/* 已退款 */}
          {(effectiveStatus === 'refunded' || effectiveStatus === 'partial_refunded') && (
            <div className="text-center space-y-3 py-4">
              <div className="w-16 h-16 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto">
                <RefreshCw className="w-8 h-8 text-blue-400" />
              </div>
              <p className="font-semibold text-lg">{effectiveStatus === 'refunded' ? '已全额退款' : '已部分退款'}</p>
            </div>
          )}

          {/* 失败或取消或超时 */}
          {(effectiveStatus === 'failed' || effectiveStatus === 'cancelled') && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <p className="font-semibold text-lg">{isTimeout ? '支付已超时' : '支付失败或已取消'}</p>
              <p className="text-sm text-muted-foreground">该订单已无法继续支付，请重新发起或联系客服</p>
              <div className="flex justify-center gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowSupportDialog(true)}>
                  联系客服
                </Button>
                <Button onClick={() => navigate(isAgentFee ? '/agent' : '/pricing')}>
                  重新发起
                </Button>
              </div>
            </div>
          )}

          {/* 订单金额明细 */}
          <div className="rounded-xl bg-muted/30 border border-border/50 divide-y divide-border/50">
            <div className="flex justify-between items-center px-4 py-3 text-sm">
              <span className="text-muted-foreground">订单类型</span>
              <span className="font-medium">{isAgentFee ? '代理费' : '积分充值'}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 text-sm">
              <span className="text-muted-foreground">支付金额</span>
              <span className="font-bold text-primary text-base">¥{Number(order.amount).toFixed(2)}</span>
            </div>
            {order.credits > 0 && (
              <div className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-muted-foreground">获得积分</span>
                <span className="font-medium text-amber-400">+{order.credits}</span>
              </div>
            )}
            {order.remark && (
              <div className="flex justify-between items-start px-4 py-3 text-sm gap-4">
                <span className="text-muted-foreground shrink-0">备注</span>
                <span className="text-right text-pretty">{order.remark}</span>
              </div>
            )}
            <div className="flex justify-between items-center px-4 py-3 text-sm">
              <span className="text-muted-foreground">创建时间</span>
              <span>{new Date(order.created_at).toLocaleString('zh-CN')}</span>
            </div>
          </div>

          {/* 操作按钮 */}
          {(order.status === 'paid' || order.status === 'completed') && isAgentFee && (
            <Button className="w-full gradient-primary-bg border-0 text-white hover:opacity-90"
              onClick={() => navigate('/profile/promote')}>
              进入推广后台
            </Button>
          )}
          {order.status === 'pending' && (
            <Button variant="outline" className="w-full" onClick={() => navigate('/agent')}>
              取消，返回代理页
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 客服弹窗 */}
      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <DialogContent className="sm:max-w-md max-w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">联系专属客服</DialogTitle>
            <DialogDescription className="text-center pt-2">
              请使用微信扫一扫下方二维码，添加客服为您解决支付问题
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-6">
            <div className="p-3 bg-white rounded-2xl shadow-sm border">
              <QRCodeDataUrl
                text="https://work.weixin.qq.com/kfid/kfc_miaoda_support"
                width={220}
                color="#000000"
                backgroundColor="#ffffff"
              />
            </div>
            <p className="text-sm font-medium text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
              服务时间：周一至周日 9:00 - 22:00
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
