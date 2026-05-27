import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollText, ArrowRightLeft, PlusCircle, MinusCircle } from 'lucide-react';
import type { CreditLog } from '@/types';

export default function CreditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<(CreditLog & { p_type?: string, expired_at?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!user) return;
    loadLogs(1);
  }, [user]);

  const loadLogs = async (pageNum: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const from = (pageNum - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count } = await supabase
        .from('credit_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (data) {
        if (pageNum === 1) {
          setLogs(data as (CreditLog & { p_type?: string, expired_at?: string })[]);
        } else {
          setLogs(prev => [...prev, ...(data as (CreditLog & { p_type?: string, expired_at?: string })[])]);
        }
        setHasMore(count !== null && from + data.length < count);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Failed to load credit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      recharge: '积分充值',
      consume: '平台消费',
      reward: '系统赠送',
      refund: '积分退还',
      admin_adjust: '系统调整',
      register: '注册奖励',
      invite: '邀请奖励',
      expire: '过期失效',
    };
    return typeMap[type] || type;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-primary" />
          积分流水
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          查看您的积分获取与消费记录
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" /> 交易明细
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full max-w-full overflow-x-auto bg-card rounded-b-xl">
            <Table className="[&>div]:max-w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px] whitespace-nowrap">时间</TableHead>
                  <TableHead className="whitespace-nowrap">交易类型</TableHead>
                  <TableHead className="whitespace-nowrap">详情说明</TableHead>
                  <TableHead className="whitespace-nowrap">积分类型</TableHead>
                  <TableHead className="text-right whitespace-nowrap">变动额</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      暂无积分流水记录
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('zh-CN', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className="font-normal">
                          {getTypeLabel(log.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate" title={log.description || log.remark || '-'}>
                        {log.description || log.remark || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {log.p_type === 'recharge' ? <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">充值积分</Badge> : 
                         log.p_type === 'gift' ? <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">赠送积分</Badge> : 
                         <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <span className={`font-bold flex items-center justify-end gap-1 ${log.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {log.amount > 0 ? <PlusCircle className="w-3.5 h-3.5" /> : <MinusCircle className="w-3.5 h-3.5" />}
                          {Math.abs(log.amount).toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {hasMore && (
            <div className="p-4 border-t border-border flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => loadLogs(page + 1)}
                disabled={loading}
              >
                {loading ? '加载中...' : '加载更多'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
