import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Copyright, AlertTriangle, Bot, CheckCircle2, Globe, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';

// ── 声明版本 ─────────────────────────────────────────────────────
const DISCLAIMER_VERSION = 'v1';

// ── 持久化存储 key ───────────────────────────────────────────────
const AGREED_KEY = `legal_disclaimer_agreed_${DISCLAIMER_VERSION}`;

function getAgreedState(): boolean {
  try { return localStorage.getItem(AGREED_KEY) === 'true'; } catch { return false; }
}
function setAgreedState(v: boolean) {
  try { localStorage.setItem(AGREED_KEY, String(v)); } catch { /* noop */ }
}

// ── 三语内容 ─────────────────────────────────────────────────────
type Lang = 'zh' | 'en' | 'th';

const i18n: Record<Lang, {
  title: string;
  subtitle: string;
  badge: string;
  updated: string;
  importantTitle: string;
  importantBody: string;
  agreeBtn: string;
  agreedLabel: string;
  alreadyAgreed: string;
  scrollHint: string;
  progressLabel: string;
  sections: { title: string; content: string[] }[];
}> = {
  zh: {
    title: '法律与免责声明',
    subtitle: '请滚动阅读全文后确认同意',
    badge: 'AI生成内容平台',
    updated: '更新于 2026-01-01',
    importantTitle: '⚠️ 重要提示',
    importantBody: '使用本平台即表示您已阅读并同意本声明的全部内容。若不同意，请停止使用本平台服务。',
    agreeBtn: '我已阅读并同意',
    agreedLabel: '已同意本声明',
    alreadyAgreed: '您已于之前阅读并同意本声明',
    scrollHint: '请向下滚动阅读全文',
    progressLabel: '阅读进度',
    sections: [
      {
        title: '一、用户内容版权与侵权责任',
        content: [
          '用户通过本平台上传、输入或提供的所有文字、图片、音频、视频等原始素材（以下简称"用户内容"），其著作权及相关权利均归用户本人或原始权利人所有。',
          '用户保证其提供的内容合法、真实，且已获得必要的版权授权或属于合理使用范围，不侵犯任何第三方的知识产权、肖像权、名誉权或其他合法权益。',
          '因用户内容引发的任何版权纠纷、侵权索赔或法律责任，均由用户本人独立承担，本平台不承担连带责任。',
          '本平台保留在接到有效侵权通知后，依法删除相关内容并配合权利人维权的权利。',
        ],
      },
      {
        title: '二、平台技术服务免责声明',
        content: [
          '本平台（AI筑梦呈剧）定位为 AI 技术工具提供方，仅提供小说/短剧转动漫视频的技术转化服务，不参与用户内容的创作、策划或发布。',
          '本平台不对用户利用本平台服务生成的剧本、分镜素材、角色形象及最终成片（以下统称"生成内容"）的著作权归属作出任何承诺或担保。',
          '生成内容的版权归属、使用授权及商业化事宜，由用户自行评估和处理。本平台对生成内容用于商业用途可能引发的版权争议不承担任何责任。',
          '本平台提供的 AI 生成结果受技术条件限制，不保证内容的准确性、完整性或适用性，用户应自行核实并承担使用风险。',
        ],
      },
      {
        title: '三、AI 生成标识与合规使用要求',
        content: [
          '本平台依照《互联网信息服务深度合成管理规定》等相关法律法规，对通过本平台生成的所有 AI 漫剧内容添加"AI生成"显著标识（水印、元数据或声明）。',
          '用户在传播、分发或发布生成内容时，不得擅自删除、遮挡或篡改上述"AI生成"标识，否则由此引发的法律责任由用户自行承担。',
          '严禁将本平台生成内容用于以下违法违规用途：散布谣言或虚假信息、侮辱或诽谤他人、色情低俗或暴力恐怖内容、政治煽动或危害国家安全、任何形式的欺诈行为，以及其他违反法律法规的行为。',
          '用户违规使用本平台服务所造成的一切后果及法律责任由用户自行承担，本平台将依法配合有关机关的调查处理。',
        ],
      },
      {
        title: '四、其他条款',
        content: [
          '本声明是《用户协议》和《隐私政策》的补充，与上述文件共同构成用户与本平台之间的完整协议。',
          '本平台保留在不另行通知的情况下修改本声明的权利，修改后的声明自发布之日起生效。',
          '如对本声明有任何疑问，请通过以下联系方式与我们沟通：邮箱 yi3858@163.com 或微信 yy889358。',
          '本声明的解释、适用及争议解决均适用中华人民共和国法律。',
        ],
      },
    ],
  },

  en: {
    title: 'Legal Disclaimer',
    subtitle: 'Please scroll to read the full text before agreeing',
    badge: 'AI Content Platform',
    updated: 'Updated 2026-01-01',
    importantTitle: '⚠️ Important Notice',
    importantBody: 'By using this platform you confirm that you have read and agree to all terms of this disclaimer. If you do not agree, please stop using the service.',
    agreeBtn: 'I Have Read & Agree',
    agreedLabel: 'Disclaimer Agreed',
    alreadyAgreed: 'You have previously read and agreed to this disclaimer',
    scrollHint: 'Please scroll down to read the full text',
    progressLabel: 'Reading progress',
    sections: [
      {
        title: '1. User Content Copyright & Infringement Liability',
        content: [
          'All original materials (text, images, audio, video, etc.) uploaded, input, or provided by the user through this platform ("User Content") are owned by the user or the original rights holder.',
          'Users warrant that their content is lawful, authentic, and has obtained the necessary copyright authorisation or falls within fair use, and does not infringe any third-party intellectual property, portrait rights, reputation, or other legal rights.',
          'Any copyright disputes, infringement claims, or legal liability arising from User Content shall be borne solely by the user; this platform bears no joint liability.',
          'This platform reserves the right to remove relevant content in accordance with law upon receipt of a valid infringement notice and to cooperate with rights holders in enforcement.',
        ],
      },
      {
        title: '2. Platform Technology Service Disclaimer',
        content: [
          'This platform (AI DreamComic) is positioned as an AI technology tool provider, offering only technical conversion services from novels/short dramas to animated videos, and does not participate in the creation, planning, or distribution of user content.',
          'This platform makes no promise or guarantee regarding the ownership of copyrights in scripts, storyboard materials, character designs, or final videos ("Generated Content") produced using its services.',
          'Copyright ownership, usage authorisation, and commercialisation of Generated Content are solely the user\'s responsibility. This platform bears no liability for any copyright disputes arising from commercial use of Generated Content.',
          'AI-generated results are subject to technical limitations. This platform does not guarantee the accuracy, completeness, or fitness for purpose of Generated Content; users must verify independently and bear the associated risks.',
        ],
      },
      {
        title: '3. AI-Generated Content Label & Compliance Requirements',
        content: [
          'In accordance with the Provisions on the Administration of Deep Synthesis Internet Information Services and other applicable laws, this platform adds a prominent "AI-Generated" label (watermark, metadata, or declaration) to all AI comic content produced on the platform.',
          'When disseminating, distributing, or publishing Generated Content, users must not remove, obscure, or alter the "AI-Generated" label; any resulting legal liability shall be borne by the user.',
          'It is strictly prohibited to use Generated Content for any illegal or non-compliant purposes, including: spreading rumours or false information; insulting or defaming others; pornographic, vulgar, violent, or terrorist content; political incitement or endangering national security; any form of fraud; or any other act in violation of laws and regulations.',
          'Users shall bear all consequences and legal liability for misuse of this platform\'s services; this platform will cooperate with competent authorities in investigations as required by law.',
        ],
      },
      {
        title: '4. Other Terms',
        content: [
          'This disclaimer supplements the Terms of Service and Privacy Policy and, together with those documents, constitutes the complete agreement between the user and this platform.',
          'This platform reserves the right to amend this disclaimer without prior notice; amended terms take effect from the date of publication.',
          'For any questions regarding this disclaimer, please contact us at: Email yi3858@163.com or WeChat yy889358.',
          'This disclaimer shall be governed by and construed in accordance with the laws of the People\'s Republic of China.',
        ],
      },
    ],
  },

  th: {
    title: 'ข้อจำกัดความรับผิดชอบทางกฎหมาย',
    subtitle: 'โปรดเลื่อนอ่านข้อความทั้งหมดก่อนยืนยัน',
    badge: 'แพลตฟอร์มเนื้อหา AI',
    updated: 'อัปเดต 2026-01-01',
    importantTitle: '⚠️ ข้อความสำคัญ',
    importantBody: 'การใช้แพลตฟอร์มนี้หมายความว่าคุณได้อ่านและยอมรับข้อกำหนดทั้งหมดในข้อจำกัดนี้แล้ว หากไม่ยอมรับ กรุณาหยุดใช้บริการ',
    agreeBtn: 'ฉันได้อ่านและยอมรับแล้ว',
    agreedLabel: 'ยอมรับข้อจำกัดแล้ว',
    alreadyAgreed: 'คุณได้อ่านและยอมรับข้อจำกัดนี้ไปแล้วก่อนหน้านี้',
    scrollHint: 'กรุณาเลื่อนลงเพื่ออ่านข้อความทั้งหมด',
    progressLabel: 'ความคืบหน้าการอ่าน',
    sections: [
      {
        title: '1. ลิขสิทธิ์เนื้อหาผู้ใช้และความรับผิดชอบด้านการละเมิด',
        content: [
          'วัสดุต้นฉบับทั้งหมด (ข้อความ รูปภาพ เสียง วิดีโอ ฯลฯ) ที่ผู้ใช้อัปโหลด ป้อน หรือจัดหาผ่านแพลตฟอร์มนี้ ("เนื้อหาผู้ใช้") เป็นของผู้ใช้หรือเจ้าของสิทธิ์ดั้งเดิม',
          'ผู้ใช้รับรองว่าเนื้อหาของตนถูกต้องตามกฎหมาย เป็นความจริง และได้รับการอนุญาตลิขสิทธิ์ที่จำเป็นหรืออยู่ในขอบเขตการใช้งานที่เป็นธรรม และไม่ละเมิดทรัพย์สินทางปัญญา สิทธิ์ภาพลักษณ์ ชื่อเสียง หรือสิทธิ์ตามกฎหมายอื่นใดของบุคคลที่สาม',
          'ข้อพิพาทด้านลิขสิทธิ์ การเรียกร้องการละเมิด หรือความรับผิดทางกฎหมายใดๆ ที่เกิดจากเนื้อหาผู้ใช้ จะต้องรับผิดชอบโดยผู้ใช้เองแต่เพียงผู้เดียว แพลตฟอร์มนี้ไม่รับผิดชอบร่วม',
          'แพลตฟอร์มนี้สงวนสิทธิ์ในการลบเนื้อหาที่เกี่ยวข้องตามกฎหมายเมื่อได้รับแจ้งการละเมิดที่ถูกต้องและให้ความร่วมมือกับเจ้าของสิทธิ์ในการบังคับใช้',
        ],
      },
      {
        title: '2. ข้อจำกัดความรับผิดชอบบริการเทคโนโลยีของแพลตฟอร์ม',
        content: [
          'แพลตฟอร์มนี้ (AI DreamComic) ทำหน้าที่เป็นผู้ให้บริการเครื่องมือเทคโนโลยี AI เพียงเท่านั้น ให้บริการแปลงนวนิยาย/ซีรีส์สั้นเป็นวิดีโอแอนิเมชั่น และไม่มีส่วนร่วมในการสร้าง วางแผน หรือเผยแพร่เนื้อหาผู้ใช้',
          'แพลตฟอร์มนี้ไม่ให้คำมั่นสัญญาหรือการรับประกันใดๆ เกี่ยวกับความเป็นเจ้าของลิขสิทธิ์ในบทภาพยนตร์ วัสดุสตอรีบอร์ด การออกแบบตัวละคร หรือวิดีโอสุดท้าย ("เนื้อหาที่สร้างขึ้น") ที่ผลิตโดยใช้บริการ',
          'ความเป็นเจ้าของลิขสิทธิ์ การอนุญาตใช้งาน และการค้าของเนื้อหาที่สร้างขึ้น เป็นความรับผิดชอบของผู้ใช้แต่เพียงผู้เดียว แพลตฟอร์มนี้ไม่รับผิดชอบต่อข้อพิพาทด้านลิขสิทธิ์ใดๆ ที่เกิดจากการใช้เนื้อหาที่สร้างขึ้นเพื่อวัตถุประสงค์ทางการค้า',
          'ผลลัพธ์ที่สร้างโดย AI อยู่ภายใต้ข้อจำกัดทางเทคนิค แพลตฟอร์มนี้ไม่รับประกันความถูกต้อง ความสมบูรณ์ หรือความเหมาะสมของเนื้อหาที่สร้างขึ้น ผู้ใช้ต้องตรวจสอบอย่างอิสระและรับความเสี่ยงที่เกี่ยวข้อง',
        ],
      },
      {
        title: '3. ป้ายกำกับเนื้อหา AI และข้อกำหนดการปฏิบัติตาม',
        content: [
          'ตามข้อกำหนดว่าด้วยการบริหารบริการสังเคราะห์เชิงลึกทางอินเทอร์เน็ตและกฎหมายที่บังคับใช้อื่นๆ แพลตฟอร์มนี้เพิ่มป้ายกำกับ "สร้างโดย AI" ที่เด่นชัด (ลายน้ำ ข้อมูลเมตา หรือคำประกาศ) ให้กับเนื้อหาการ์ตูน AI ทั้งหมดที่ผลิตบนแพลตฟอร์ม',
          'เมื่อเผยแพร่ แจกจ่าย หรือตีพิมพ์เนื้อหาที่สร้างขึ้น ผู้ใช้จะต้องไม่ลบ บดบัง หรือแก้ไขป้ายกำกับ "สร้างโดย AI" มิฉะนั้นความรับผิดทางกฎหมายที่เกิดขึ้นจะต้องรับผิดชอบโดยผู้ใช้',
          'ห้ามมิให้ใช้เนื้อหาที่สร้างขึ้นเพื่อวัตถุประสงค์ที่ผิดกฎหมายหรือไม่เป็นไปตามข้อกำหนด รวมถึง: การเผยแพร่ข่าวลือหรือข้อมูลเท็จ การดูหมิ่นหรือหมิ่นประมาทผู้อื่น เนื้อหาลามกอนาจาร หยาบคาย รุนแรง หรือก่อการร้าย การยุยงทางการเมืองหรือการคุกคามความมั่นคงของชาติ การฉ้อโกงในทุกรูปแบบ หรือการกระทำอื่นใดที่ฝ่าฝืนกฎหมายและระเบียบข้อบังคับ',
          'ผู้ใช้จะต้องรับผิดชอบต่อผลที่ตามมาและความรับผิดทางกฎหมายทั้งหมดจากการใช้บริการของแพลตฟอร์มนี้ในทางที่ผิด แพลตฟอร์มนี้จะให้ความร่วมมือกับหน่วยงานที่มีอำนาจในการสืบสวนตามที่กฎหมายกำหนด',
        ],
      },
      {
        title: '4. ข้อกำหนดอื่นๆ',
        content: [
          'ข้อจำกัดนี้เป็นส่วนเสริมของข้อกำหนดการใช้บริการและนโยบายความเป็นส่วนตัว และร่วมกับเอกสารดังกล่าว ถือเป็นข้อตกลงที่สมบูรณ์ระหว่างผู้ใช้และแพลตฟอร์มนี้',
          'แพลตฟอร์มนี้สงวนสิทธิ์ในการแก้ไขข้อจำกัดนี้โดยไม่ต้องแจ้งล่วงหน้า ข้อกำหนดที่แก้ไขมีผลบังคับใช้ตั้งแต่วันที่ประกาศ',
          'หากมีคำถามเกี่ยวกับข้อจำกัดนี้ กรุณาติดต่อเราที่: อีเมล yi3858@163.com หรือ WeChat yy889358',
          'ข้อจำกัดนี้อยู่ภายใต้กฎหมายของสาธารณรัฐประชาชนจีนและตีความตามกฎหมายดังกล่าว',
        ],
      },
    ],
  },
};

const LANG_LABELS: Record<Lang, string> = { zh: '中文', en: 'EN', th: 'ไทย' };
const SECTION_ICONS = [
  <Copyright className="w-5 h-5 text-primary shrink-0 mt-0.5" />,
  <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />,
  <Bot className="w-5 h-5 text-primary shrink-0 mt-0.5" />,
  <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />,
];

// ── 公开读取函数 ──────────────────────────────────────────────────
export { getAgreedState };

interface Props {
  trigger?: React.ReactNode;
  onAgreed?: () => void;
  defaultLang?: Lang;
}

export function LegalDisclaimerDialog({ trigger, onAgreed, defaultLang = 'zh' }: Props) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>(defaultLang);
  const [agreed, setAgreed] = useState(false);
  // 阅读进度 0-100
  const [scrollProgress, setScrollProgress] = useState(0);
  // 是否已滚动到底（>=95%）
  const [hasReadAll, setHasReadAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 打开弹窗时重置进度并同步同意状态
  useEffect(() => {
    if (open) {
      const alreadyAgreed = getAgreedState();
      setAgreed(alreadyAgreed);
      // 已同意过则无需强制重读
      if (alreadyAgreed) {
        setScrollProgress(100);
        setHasReadAll(true);
      } else {
        setScrollProgress(0);
        setHasReadAll(false);
      }
      // 重置滚动位置
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }, 50);
    }
  }, [open]);

  // 切换语言后重置进度（已同意则不重置）
  useEffect(() => {
    if (!agreed) {
      setScrollProgress(0);
      setHasReadAll(false);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [lang]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) {
      setScrollProgress(100);
      setHasReadAll(true);
      return;
    }
    const pct = Math.min(100, Math.round((el.scrollTop / scrollable) * 100));
    setScrollProgress(pct);
    if (pct >= 95) setHasReadAll(true);
  }, []);

  // 写入 Supabase 合规记录
  const saveConsentLog = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('legal_consent_logs').insert({
        user_id: session?.user?.id ?? null,
        disclaimer_version: DISCLAIMER_VERSION,
        lang,
        agreed_at: new Date().toISOString(),
        user_agent: navigator.userAgent.slice(0, 512),
      });
    } catch {
      // 写入失败不阻塞同意流程
    }
  };

  const handleAgree = async () => {
    if (!hasReadAll || submitting) return;
    setSubmitting(true);
    await saveConsentLog();
    setAgreedState(true);
    setAgreed(true);
    setSubmitting(false);
    onAgreed?.();
  };

  const content = i18n[lang];

  const defaultTrigger = (
    <button className="text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-2 hover:underline">
      {i18n[defaultLang].title}
    </button>
  );

  // 进度条颜色
  const progressColor =
    scrollProgress >= 95 ? 'bg-green-500' :
    scrollProgress >= 50 ? 'bg-primary' :
    'bg-primary/60';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </DialogTrigger>

      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] flex flex-col p-0">
        {/* ── 头部 ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base md:text-lg text-balance leading-snug">
                  {content.title}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{content.subtitle}</p>
              </div>
            </div>

            {/* 语言切换 */}
            <div className="flex items-center gap-1 shrink-0 border border-border rounded-lg p-0.5">
              <Globe className="w-3.5 h-3.5 text-muted-foreground ml-1.5" />
              {(['zh', 'en', 'th'] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    'text-xs px-2 py-1 rounded-md transition-colors',
                    lang === l
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge variant="secondary" className="text-xs font-normal gap-1">
              <Bot className="w-3 h-3" /> {content.badge}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal">
              {content.updated}
            </Badge>
            {agreed && (
              <Badge className="text-xs font-normal gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle2 className="w-3 h-3" /> {content.agreedLabel}
              </Badge>
            )}
          </div>

          {/* ── 阅读进度条 ── */}
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{content.progressLabel}</span>
              <span className={cn(
                'font-medium tabular-nums transition-colors',
                scrollProgress >= 95 ? 'text-green-600' : 'text-foreground'
              )}>
                {scrollProgress}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300 ease-out', progressColor)}
                style={{ width: `${scrollProgress}%` }}
              />
            </div>
          </div>
        </DialogHeader>

        {/* ── 内容区（原生 div 以捕获滚动事件） ── */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6"
          style={{ scrollbarWidth: 'thin' }}
        >
          {content.sections.map((section, idx) => (
            <div key={section.title} className="space-y-3">
              <div className="flex items-start gap-2.5">
                {SECTION_ICONS[idx]}
                <h3 className="text-sm font-semibold text-foreground text-balance leading-snug">
                  {section.title}
                </h3>
              </div>
              <ul className="space-y-2.5 pl-7">
                {section.content.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed text-pretty"
                  >
                    <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/40" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* 重要提示框 */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground leading-relaxed space-y-1">
            <p className="font-medium text-foreground">{content.importantTitle}</p>
            <p>{content.importantBody}</p>
          </div>
        </div>

        {/* ── 底部确认栏 ── */}
        <div className="px-6 py-4 border-t border-border/50 shrink-0 space-y-2">
          {/* 未滚动完时的滚动提示 */}
          {!hasReadAll && !agreed && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground animate-bounce">
              <ChevronDown className="w-3.5 h-3.5" />
              <span>{content.scrollHint}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          )}

          {agreed ? (
            <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-500/8 border border-green-500/20">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span className="text-sm text-green-600 font-medium">{content.alreadyAgreed}</span>
            </div>
          ) : (
            <Button
              className={cn(
                'w-full h-11 border-0 text-white gap-2 transition-all',
                hasReadAll
                  ? 'gradient-primary-bg hover:opacity-90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
              disabled={!hasReadAll || submitting}
              onClick={handleAgree}
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? '...' : content.agreeBtn}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
