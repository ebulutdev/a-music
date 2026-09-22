import { AgentError } from '../shared/errors';
import { createLogger } from '../shared/logger';
import { assertSafeExternalUrl } from '../security/ssrf';

const log = createLogger('suno-diag');

export type KieErrorCode = 200 | 401 | 402 | 404 | 408 | 409 | 422 | 429 | 451 | 455 | 500 | 501 | 505;

export type KieErrorDetail = {
  code: KieErrorCode | number;
  name: string;
  rootCauseTr: string;
  solutionTr: string;
};

export const KIE_ERROR_CATALOG: Record<number, KieErrorDetail> = {
  401: {
    code: 401,
    name: 'Unauthorized',
    rootCauseTr: 'API Anahtarı eksik, geçersiz veya süresi dolmuş.',
    solutionTr: 'VITE_SUNO_API_KEY ortam değişkenini kontrol edin. Bearer token doğru ayarlanmalı.',
  },
  402: {
    code: 402,
    name: 'Insufficient Credits',
    rootCauseTr: 'Kie.ai hesabınızdaki bakiye/kredi bu işlem için yetersiz.',
    solutionTr: 'Kie.ai panelinden hesabınıza kredi yükleyin veya VITE_USE_MOCK_SUNO=true ile mock moduna geçin.',
  },
  404: {
    code: 404,
    name: 'Not Found',
    rootCauseTr: 'İstenen endpoint, task_id veya model sunucuda bulunamadı.',
    solutionTr: 'Endpoint URL (/api/v1/jobs/createTask) veya sorgulanan task_id değerinin doğruluğunu kontrol edin.',
  },
  408: {
    code: 408,
    name: 'Upstream Timeout',
    rootCauseTr: 'Müzik üretim servisi 10 dakikadan uzun süredir yanıt vermiyor.',
    solutionTr: 'Servis yoğun olabilir. Birkaç dakika sonra işlemi yeniden deneyin.',
  },
  409: {
    code: 409,
    name: 'Conflict',
    rootCauseTr: 'Aynı ses kaydı veya işlem kaydı zaten mevcut.',
    solutionTr: 'İşlemi yeni bir ses veya yeni bir ID ile başlatın.',
  },
  422: {
    code: 422,
    name: 'Validation Error',
    rootCauseTr: 'Gönderilen parametreler Kie.ai kurallarına uymuyor (karakter sınırı, geçersiz model, eksik zorunlu alan).',
    solutionTr: 'Model limitlerini (title <= 100, prompt <= 5000, style <= 1000) ve custom_mode kurallarını kontrol edin.',
  },
  429: {
    code: 429,
    name: 'Rate Limited',
    rootCauseTr: 'Dakikalık/saatlik maksimum istek kotası aşıldı.',
    solutionTr: 'İsteklerin arasına gecikme koyun veya biraz bekleyip tekrar deneyin.',
  },
  451: {
    code: 451,
    name: 'Media Fetch Failed',
    rootCauseTr: 'Kie.ai verilen ses/görsel URL adresine erişemedi veya indirme engellendi.',
    solutionTr: 'upload_url adresinin herkese açık, erişilebilir ve geçerli bir HTTPS adresi olduğundan emin olun.',
  },
  455: {
    code: 455,
    name: 'Service Maintenance',
    rootCauseTr: 'Kie.ai sunucuları şu anda bakım modunda.',
    solutionTr: 'Lütfen sistem bakımının tamamlanmasını bekleyin.',
  },
  500: {
    code: 500,
    name: 'Internal Server Error',
    rootCauseTr: 'Kie.ai sunucu tarafında beklenmeyen bir hata oluştu.',
    solutionTr: 'Kie.ai durum sayfasını kontrol edin veya biraz sonra tekrar deneyin.',
  },
  501: {
    code: 501,
    name: 'Generation Failed',
    rootCauseTr: 'İçerik üretim görevi model seviyesinde başarısız oldu.',
    solutionTr: 'Prompt veya müzik tarzını basitleştirip yeniden deneyin.',
  },
  505: {
    code: 505,
    name: 'Feature Disabled',
    rootCauseTr: 'İstenen model veya özellik şu anda devre dışı bırakılmış.',
    solutionTr: 'Farklı bir model (örneğin V6 veya V6_WILD) seçin.',
  },
};

/**
 * Validates audio upload URL for Kie.ai live compatibility.
 * Throws early before making an impossible HTTP request to Kie.
 */
export function validateAudioUrlForKie(url: string, context: string, isMock: boolean): void {
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new AgentError('KIE_VALIDATION', `${context}: 'upload_url' alanı zorunludur ve boş bırakılamaz.`);
  }

  const trimmed = url.trim();
  if (trimmed.startsWith('blob:') || trimmed.startsWith('local://')) {
    if (!isMock) {
      log.error('kie.invalid_upload_url', { context, url: trimmed });
      throw new AgentError(
        'KIE_LOCAL_URL_ERROR',
        `[Kök Neden]: '${trimmed.slice(0, 24)}...' adresi tarayıcının yerel bellek adresidir (blob). ` +
          `Kie.ai sunucuları internet üzerinden bu dosyayı indiremez.\n` +
          `[Çözüm]: Canlı API çağrısı için sesi S3, Cloudinary veya Kie upload servisine yükleyip genel HTTPS linkini vermelisiniz. ` +
          `Geliştirme/test aşamasında VITE_USE_MOCK_SUNO=true kullanarak sanal ortamda güvenle test edebilirsiniz.`,
        true,
      );
    }
  }

  if (!isMock && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    throw new AgentError(
      'KIE_URL_SCHEME_ERROR',
      `[Kök Neden]: upload_url ('${trimmed}') geçerli bir web adresi değil. ` +
        `Kie.ai yalnızca standart HTTP/HTTPS bağlantılarını kabul eder.`,
      true,
    );
  }

  if (!isMock) {
    // SSRF Guardrail: Block localhost, 127.0.0.1, 169.254.169.254, private IP ranges
    assertSafeExternalUrl(trimmed, context);
  }
}

/**
 * Formats a rich, actionable error diagnostic report from an HTTP failure or API error.
 */
export function diagnoseKieError(
  statusOrCode: number,
  rawMessage: string,
  endpoint: string,
  payload: unknown,
): AgentError {
  const catalogEntry = KIE_ERROR_CATALOG[statusOrCode] || {
    code: statusOrCode,
    name: 'Unknown Error',
    rootCauseTr: `Bilinmeyen durum kodu (${statusOrCode}): ${rawMessage || 'Açıklama verilmedi.'}`,
    solutionTr: 'Girdi verilerini ve API bağlantısını kontrol edin.',
  };

  const detailedMessage =
    `[Kie.ai API Hatası] ${statusOrCode} - ${catalogEntry.name}\n` +
    `• Kök Neden: ${catalogEntry.rootCauseTr}\n` +
    `• Çözüm Önerisi: ${catalogEntry.solutionTr}\n` +
    `• Endpoint: ${endpoint}\n` +
    (rawMessage ? `• Ham Yanıt: ${rawMessage}\n` : '');

  log.error('kie.diagnostic', {
    statusOrCode,
    name: catalogEntry.name,
    endpoint,
    rawMessage,
    payload,
  });

  return new AgentError('KIE_API_ERROR', detailedMessage, true);
}
