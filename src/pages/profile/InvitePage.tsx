import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, Users, Gift, Share2, CheckCircle2, Trophy, Crown, Medal, ImageIcon as ImageIcon2 } from 'lucide-react';
import { toast } from 'sonner';
import { PosterGenerator } from '@/components/profile/PosterGenerator';

export default function InvitePage() {
  const { user, profile } = useAuth();
  const [inviteRecords, setInviteRecords] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [showPoster, setShowPoster] = useState(false);
  const [generating, setGenerating] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      const [recordsRes, boardRes] = await Promise.all([
        supabase
          .from('invite_records')
          .select(`
            id,
            created_at,
            inviter_reward,
            status,
            invitee:profiles!invite_records_invitee_id_fkey(username, phone)
          `)
          .eq('inviter_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.rpc('get_monthly_invite_leaderboard', { p_limit: 10 })
      ]);
      
      if (recordsRes.data) setInviteRecords(recordsRes.data);
      if (boardRes.data) setLeaderboard(boardRes.data);
      
      setLoading(false);
      setLoadingBoard(false);
    }
    fetchData();
  }, [user]);

  const inviteLink = `${window.location.origin}/#/register?inviteCode=${profile?.invite_code || profile?.promo_code || ''}`;

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(type === 'code' ? '邀请码已复制' : '邀请链接已复制');
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const totalRewards = inviteRecords.reduce((sum, r) => sum + Number(r.inviter_reward), 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">邀请中心</h1>
        <p className="text-sm text-muted-foreground mt-1">邀请好友注册，双方均可获得丰厚积分奖励</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* 邀请数据概览 */}
        <Card className="md:col-span-1 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> 邀请战绩
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground">累计邀请人数</p>
              <div className="text-4xl font-bold text-primary mt-1">{inviteRecords.length} <span className="text-base font-normal text-muted-foreground">人</span></div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">累计获得奖励</p>
              <div className="text-2xl font-bold text-emerald-500 mt-1 flex items-center gap-2">
                <Gift className="w-5 h-5" /> {totalRewards} <span className="text-sm font-normal text-muted-foreground">积分</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 邀请方式 */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" /> 专属邀请方式
            </CardTitle>
            <CardDescription>好友通过您的邀请码或链接注册，双方均可获得 20 积分奖励</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">专属邀请码</label>
              <div className="flex gap-2">
                <Input value={profile?.invite_code || profile?.promo_code || ''} readOnly className="font-mono text-lg tracking-widest text-center md:text-left bg-muted/30" />
                <Button variant="secondary" className="shrink-0 w-24" onClick={() => copyToClipboard(profile?.invite_code || profile?.promo_code || '', 'code')}>
                  {copiedCode ? <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copiedCode ? '已复制' : '复制'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">专属邀请链接</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input value={inviteLink} readOnly className="text-sm text-muted-foreground bg-muted/30" />
                <div className="flex gap-2">
                  <Button className="flex-1 sm:w-24 shrink-0 gradient-primary-bg border-0 text-white hover:opacity-90" onClick={() => copyToClipboard(inviteLink, 'link')}>
                    {copiedLink ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
                    {copiedLink ? '已复制' : '分享'}
                  </Button>
                  <Button variant="outline" className="flex-1 sm:w-auto shrink-0" onClick={() => setPosterOpen(true)}>
                    <ImageIcon2 className="w-4 h-4 mr-2" />
                    海报
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">邀请规则说明：</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>好友在注册时填写您的邀请码，或直接通过您的专属链接访问注册页面，即可自动绑定邀请关系。</li>
                <li>好友完成注册和手机号验证后，您和好友都将获得 <strong className="text-primary">20个赠送积分</strong>。</li>
                <li>赠送的积分有效期默认为 30 天，请及时使用。</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* 本月邀请排行榜 */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" /> 本月邀请达人榜
            </CardTitle>
            <CardDescription>每月邀请人数 Top 10</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {loadingBoard ? (
              <div className="space-y-4 px-6 py-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                本月暂无数据，快来拿下第一名吧！
              </div>
            ) : (
              <div className="space-y-1">
                {leaderboard.map((item, index) => (
                  <div key={item.inviter_id} className={`flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors ${user?.id === item.inviter_id ? 'bg-primary/5' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-6 flex justify-center font-bold text-lg">
                        {index === 0 ? <Crown className="w-6 h-6 text-amber-500" /> : 
                         index === 1 ? <Medal className="w-5 h-5 text-slate-300" /> :
                         index === 2 ? <Medal className="w-5 h-5 text-amber-700" /> : 
                         <span className="text-muted-foreground text-base">{index + 1}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center">
                          {item.avatar_url ? (
                            <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-primary font-medium">
                              {(item.username || 'U')[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium">
                          {user?.id === item.inviter_id ? '我' : 
                           (item.username || (item.phone ? item.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '匿名用户'))}
                        </div>
                      </div>
                    </div>
                    <div className="text-primary font-bold">{item.invite_count} <span className="text-xs font-normal text-muted-foreground">人</span></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 邀请记录列表 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>邀请记录</CardTitle>
            <CardDescription>查看您邀请的好友及获得的奖励明细</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full max-w-full overflow-x-auto">
              <Table className="[&>div]:max-w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[180px] whitespace-nowrap pl-6">邀请时间</TableHead>
                    <TableHead className="whitespace-nowrap">受邀用户</TableHead>
                    <TableHead className="whitespace-nowrap">状态</TableHead>
                    <TableHead className="text-right whitespace-nowrap pr-6">获得奖励</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {inviteRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      您还没有邀请过好友，赶快去分享吧！
                    </TableCell>
                  </TableRow>
                ) : (
                  inviteRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap pl-6">
                        {new Date(record.created_at).toLocaleString('zh-CN', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-medium">
                            {record.invitee?.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span>
                            {record.invitee?.username || 
                             (record.invitee?.phone ? record.invitee.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '匿名用户')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record.status === 'completed' ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">奖励已发放</Badge>
                        ) : record.status === 'revoked' ? (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">已撤销</Badge>
                        ) : (
                          <Badge variant="outline">{record.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap pr-6">
                        <span className={`font-bold ${record.status === 'completed' ? 'text-emerald-500' : 'text-muted-foreground line-through'}`}>
                          +{record.inviter_reward} 积分
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </div>

      <PosterGenerator 
        open={posterOpen} 
        onOpenChange={setPosterOpen} 
        inviteLink={inviteLink} 
        inviteCode={profile?.invite_code || profile?.promo_code || ''} 
      />
    </div>
  );
}