import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
// @ts-ignore
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
// @ts-ignore
import type { Profile } from '@/types/types';
import { toast } from 'sonner';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
  return data;
}
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithUsername: (username: string, password: string, referrerCode?: string) => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string, password?: string) => Promise<{ error: Error | null }>;
  signUpWithPhone: (phone: string, password?: string, referrerCode?: string) => Promise<{ error: Error | null }>;
  /** 向邮箱发送 OTP 验证码 */
  sendEmailOtp: (email: string) => Promise<{ error: Error | null }>;
  /** 验证邮箱 OTP 并完成登录（账号不存在时自动创建） */
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  /** 邮箱 OTP 验证通过后补充密码完成正式注册（发积分、绑推广码） */
  completeEmailSignUp: (email: string, password: string, referrerCode?: string) => Promise<{ error: Error | null }>;
  /** 邮箱 + 密码直接登录 */
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const profileData = await getProfile(user.id);
    setProfile(profileData);
  };

  useEffect(() => {
    supabase
      .auth
      .getSession()
      // @ts-ignore
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        // 必须返回 getProfile Promise，使 .finally() 等待其完成后再 setLoading(false)
        // 否则会产生竞态：profile 尚未赋值时 loading 已变 false，AdminLayout 误判无权限
        if (session?.user) {
          return getProfile(session.user.id).then(setProfile);
        }
      })
      // @ts-ignore
      .catch(error => {
        toast.error(`获取用户信息失败: ${error.message}`);
      })
      .finally(() => {
        setLoading(false);
      });

    // @ts-ignore
    // In this function, do NOT use any await calls. Use `.then()` instead to avoid deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithUsername = async (username: string, password: string) => {
    try {
      const email = `${username}@miaoda.com`;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithUsername = async (username: string, password: string, referrerCode?: string) => {
    try {
      const email = `${username}@miaoda.com`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });

      if (error) throw error;

      // 推广码绑定：注册成功后写入 referrer_id（首次注册永久绑定）
      if (referrerCode && data.user) {
        const { data: referrer } = await supabase
          .from('profiles')
          .select('id')
          .eq('promo_code', referrerCode)
          .maybeSingle();
        if (referrer) {
          await supabase
            .from('profiles')
            .update({ referrer_id: referrer.id })
            .eq('id', data.user.id);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithPhone = async (phone: string, password?: string) => {
    try {
      // 模拟手机号为邮箱登录以便复用已有机制，真实业务如果配置了 supabase 手机登录可直接用 auth.signInWithOtp 等
      // 为了不破坏现有的无验证机制，我们继续使用 email+password 虚拟化手机号
      const email = `${phone}@phone.miaoda.com`;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: password || '123456', // 若未开启真实密码则给个默认值
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithPhone = async (phone: string, password?: string, referrerCode?: string) => {
    try {
      const email = `${phone}@phone.miaoda.com`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password: password || '123456',
        options: {
          data: {
            username: phone, // 默认用手机号当用户名
            phone
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Handle referral logic and trigger point generation through Edge Function
        if (referrerCode) {
          try {
            await supabase.functions.invoke('handle_invite_reward', {
              body: { inviteCode: referrerCode }
            });
          } catch (funcErr) {
            console.error('Failed to trigger handle_invite_reward:', funcErr);
          }
        }
        
        // Setup initial register reward package
        try {
          const { data: configs } = await supabase
            .from('point_configs')
            .select('key, value');
            
          const registerReward = configs?.find(c => c.key === 'register_reward')?.value || 30;
          const validityDays = configs?.find(c => c.key === 'reward_validity_days')?.value || 30;
          
          const expiredAt = new Date();
          expiredAt.setDate(expiredAt.getDate() + validityDays);
          
          // 给新用户发注册积分
          await supabase.from('user_point_packages').insert({
            user_id: data.user.id,
            total_points: registerReward,
            remain_points: registerReward,
            point_type: 'gift',
            source_type: 'register',
            expired_at: expiredAt.toISOString()
          });
          
          // 记录流水
          await supabase.from('credit_logs').insert({
            user_id: data.user.id,
            amount: registerReward,
            description: '新人注册奖励',
            source: 'register',
            p_type: 'gift',
            expired_at: expiredAt.toISOString()
          });
          
          // 更新总可用积分
          await supabase.rpc('increment_profile_credits', {
            p_user_id: data.user.id,
            p_amount: registerReward
          });
        } catch (pointErr) {
          console.error('Failed to issue register points:', pointErr);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  /** 向邮箱发送 OTP */
  const sendEmailOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  /** 验证邮箱 OTP 并完成登录 */
  const verifyEmailOtp = async (email: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  /** OTP 验证成功后补充密码 + 发积分 + 绑推广码（注册专用） */
  const completeEmailSignUp = async (email: string, password: string, referrerCode?: string) => {
    try {
      // 设置密码
      const { data: updateData, error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;

      const userId = updateData.user?.id;
      if (!userId) throw new Error('用户 ID 获取失败');

      // 推广码绑定
      if (referrerCode) {
        try {
          await supabase.functions.invoke('handle_invite_reward', {
            body: { inviteCode: referrerCode },
          });
        } catch (funcErr) {
          console.error('handle_invite_reward failed:', funcErr);
        }
      }

      // 发注册积分
      try {
        const { data: configs } = await supabase.from('point_configs').select('key, value');
        const registerReward = configs?.find((c: any) => c.key === 'register_reward')?.value || 30;
        const validityDays = configs?.find((c: any) => c.key === 'reward_validity_days')?.value || 30;
        const expiredAt = new Date();
        expiredAt.setDate(expiredAt.getDate() + validityDays);

        await supabase.from('user_point_packages').insert({
          user_id: userId,
          total_points: registerReward,
          remain_points: registerReward,
          point_type: 'gift',
          source_type: 'register',
          expired_at: expiredAt.toISOString(),
        });
        await supabase.from('credit_logs').insert({
          user_id: userId,
          amount: registerReward,
          description: '新人注册奖励',
          source: 'register',
          p_type: 'gift',
          expired_at: expiredAt.toISOString(),
        });
        await supabase.rpc('increment_profile_credits', {
          p_user_id: userId,
          p_amount: registerReward,
        });
      } catch (pointErr) {
        console.error('Failed to issue register points:', pointErr);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  /** 邮箱 + 密码直接登录 */
  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithUsername, signUpWithUsername, signInWithPhone, signUpWithPhone, sendEmailOtp, verifyEmailOtp, completeEmailSignUp, signInWithEmail, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
