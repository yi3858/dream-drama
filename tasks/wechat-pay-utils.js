/**
 * 微信支付 APIv3 核心逻辑封装 (CommonJS)
 * 
 * 包含两个核心功能：
 * 1. createPayment: 统一下单，返回前端调起支付所需的参数。
 * 2. handleCallback: 支付回调通知处理（验签 + 解密）。
 * 
 * 使用说明：
 * - 请将 CONFIG 中的占位符替换为您的真实配置，或通过环境变量传入。
 * - 依赖 Node.js 内置模块 (crypto, https)，无需额外安装 npm 包。
 */

const crypto = require('crypto');
const https = require('https');

// ==================== 配置占位区 ====================
// 请替换为您的真实密钥，建议通过环境变量读取。
const CONFIG = {
  appId: process.env.WECHAT_APP_ID || 'YOUR_APP_ID',
  mchId: process.env.WECHAT_MCH_ID || 'YOUR_MCH_ID',
  apiV3Key: process.env.WECHAT_API_V3_KEY || 'YOUR_32_BYTES_API_V3_KEY',
  // 商户私钥（PEM格式字符串，需包含换行）
  privateKey: process.env.WECHAT_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
YOUR_MERCHANT_PRIVATE_KEY_CONTENT
-----END PRIVATE KEY-----`,
  // 商户证书序列号
  certSerialNo: process.env.WECHAT_CERT_SERIAL_NO || 'YOUR_CERT_SERIAL_NO',
  // 支付结果通知回调地址
  notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://your-domain.com/api/wechat/notify',
  // 微信支付平台证书公钥（PEM格式，用于回调验签）
  platformCert: process.env.WECHAT_PLATFORM_CERT || `-----BEGIN CERTIFICATE-----
YOUR_WECHAT_PLATFORM_CERT_CONTENT
-----END CERTIFICATE-----`,
};

// ==================================================

/**
 * 生成指定长度的随机字符串
 * @param {number} length - 字符串长度，默认32
 * @returns {string}
 */
function generateNonceStr(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let str = '';
  for (let i = 0; i < length; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

/**
 * 使用商户私钥对请求进行签名（RSA-SHA256）
 * @param {string} method - HTTP 方法，如 POST
 * @param {string} urlPath - URL 路径，如 /v3/pay/transactions/jsapi
 * @param {string} timestamp - 秒级时间戳字符串
 * @param {string} nonceStr - 随机字符串
 * @param {string} body - 请求体 JSON 字符串
 * @returns {string} Base64 编码的签名
 */
function createMerchantSignature(method, urlPath, timestamp, nonceStr, body) {
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  return sign.sign(CONFIG.privateKey, 'base64');
}

/**
 * 发送 HTTPS 请求到微信支付 API
 * @param {object} options - 请求选项
 * @param {string} body - 请求体 JSON 字符串
 * @returns {Promise<object>} 响应 JSON
 */
function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ statusCode: res.statusCode, body: json });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ==================================================
// 1. 统一下单函数 (JSAPI)
// ==================================================

/**
 * 发起微信支付统一下单，并生成前端调起支付所需参数。
 * 
 * @param {string} orderNo - 商户订单号（需唯一，建议长度6-32位）
 * @param {number} amount - 订单金额，单位：分（人民币）
 * @param {string} description - 商品描述，如 "AI漫剧充值-100积分"
 * @param {string} openid - 用户在当前商户下应用（appid）的 OpenID（JSAPI支付必填）
 * @returns {Promise<object>} 返回前端调起支付参数：
 *   { appId, timeStamp, nonceStr, package, signType, paySign }
 */
async function createPayment(orderNo, amount, description, openid) {
  if (!openid) {
    throw new Error('JSAPI 支付必须传入用户的 openid');
  }

  const urlPath = '/v3/pay/transactions/jsapi';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = generateNonceStr();

  const requestBody = JSON.stringify({
    appid: CONFIG.appId,
    mchid: CONFIG.mchId,
    description: description,
    out_trade_no: orderNo,
    notify_url: CONFIG.notifyUrl,
    amount: {
      total: amount,
      currency: 'CNY',
    },
    payer: {
      openid: openid,
    },
  });

  const signature = createMerchantSignature('POST', urlPath, timestamp, nonceStr, requestBody);

  const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${CONFIG.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${CONFIG.certSerialNo}"`;

  const options = {
    hostname: 'api.mch.weixin.qq.com',
    port: 443,
    path: urlPath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': authorization,
      'Content-Length': Buffer.byteLength(requestBody),
    },
  };

  const response = await httpsRequest(options, requestBody);

  if (response.statusCode !== 200) {
    throw new Error(`WeChat Pay API error: ${JSON.stringify(response.body)}`);
  }

  const prepayId = response.body.prepay_id;
  if (!prepayId) {
    throw new Error('Missing prepay_id in WeChat Pay response');
  }

  // 生成前端调起支付（JSAPI）所需参数
  const payTimestamp = String(Math.floor(Date.now() / 1000));
  const payNonceStr = generateNonceStr();
  const payPackage = `prepay_id=${prepayId}`;
  const signType = 'RSA';

  // 构造待签名字符串（注意末尾有换行符）
  const payMessage = `${CONFIG.appId}\n${payTimestamp}\n${payNonceStr}\n${payPackage}\n`;
  const paySignObj = crypto.createSign('RSA-SHA256');
  paySignObj.update(payMessage);
  const paySign = paySignObj.sign(CONFIG.privateKey, 'base64');

  return {
    appId: CONFIG.appId,
    timeStamp: payTimestamp,
    nonceStr: payNonceStr,
    package: payPackage,
    signType: signType,
    paySign: paySign,
  };
}

// ==================================================
// 2. 支付回调处理函数
// ==================================================

/**
 * 处理微信支付结果通知（回调）。
 * 流程：验签 -> 解密 -> 返回解析后的支付结果。
 * 
 * @param {object} headers - HTTP 请求头对象（需包含 wechatpay-timestamp, wechatpay-nonce, wechatpay-signature）
 * @param {object} body - HTTP 请求体 JSON 对象（微信回调结构）
 * @returns {object} 
 *   成功时：{ verified: true, data: { out_trade_no, transaction_id, trade_state, success_time, ... } }
 *   失败时：{ verified: false, reason: '...' }
 * 
 * 注意：本函数返回结果后，您需要自行向微信返回 HTTP 200 及响应体：{"code": "SUCCESS", "message": "OK"}
 */
function handleCallback(headers, body) {
  try {
    const timestamp = headers['wechatpay-timestamp'] || headers['Wechatpay-Timestamp'];
    const nonce = headers['wechatpay-nonce'] || headers['Wechatpay-Nonce'];
    const signature = headers['wechatpay-signature'] || headers['Wechatpay-Signature'];
    const serial = headers['wechatpay-serial'] || headers['Wechatpay-Serial'];

    if (!timestamp || !nonce || !signature) {
      return { verified: false, reason: 'Missing required WeChat Pay headers' };
    }

    // 1. 验证签名
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const verifyMessage = `${timestamp}\n${nonce}\n${bodyStr}\n`;
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(verifyMessage);
    const isValid = verifier.verify(CONFIG.platformCert, signature, 'base64');

    if (!isValid) {
      return { verified: false, reason: 'Signature verification failed' };
    }

    // 2. 解密回调资源
    const resource = body.resource;
    if (!resource) {
      return { verified: false, reason: 'Missing resource in callback body' };
    }

    const { ciphertext, associated_data, nonce: resourceNonce } = resource;
    if (!ciphertext || !resourceNonce) {
      return { verified: false, reason: 'Missing ciphertext or nonce in resource' };
    }

    // AEAD_AES_256_GCM 解密
    // ciphertext 为 Base64，末尾 16 字节为 Auth Tag
    const ciphertextBuffer = Buffer.from(ciphertext, 'base64');
    const authTag = ciphertextBuffer.subarray(ciphertextBuffer.length - 16);
    const encryptedData = ciphertextBuffer.subarray(0, ciphertextBuffer.length - 16);
    const keyBuffer = Buffer.from(CONFIG.apiV3Key);
    const nonceBuffer = Buffer.from(resourceNonce);
    const aadBuffer = Buffer.from(associated_data || '');

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, nonceBuffer);
    decipher.setAuthTag(authTag);
    if (associated_data) {
      decipher.setAAD(aadBuffer);
    }

    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    const decryptedJson = JSON.parse(decrypted.toString('utf8'));

    return {
      verified: true,
      data: decryptedJson,
    };

  } catch (error) {
    return { verified: false, reason: error.message };
  }
}

// ==================================================
// 导出模块
// ==================================================

module.exports = {
  createPayment,
  handleCallback,
  // 同时导出配置对象，方便外部读取/覆盖
  CONFIG,
};
