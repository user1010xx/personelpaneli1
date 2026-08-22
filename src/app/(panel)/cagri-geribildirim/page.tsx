import { ManualTrainingPage } from "@/components/modules/manual-training-page";

export default function CagriGeribildirimPage() {
  return (
    <ManualTrainingPage
      title="Çağrı Geribildirim"
      description="Çağrı geribildirim kayıtları silinmez. Tüm geçmiş bu ekranda kalır."
      persistKey="cagri-geribildirim"
      apiPath="/api/call-feedback"
      cacheModule="CALL_FEEDBACK"
      imageSrc="/visuals/headset.jpg"
      trainerLabel="Geribildirimi Veren"
      primaryTypeLabel="Geribildirim"
      lockRecordType="GERIBILDIRIM"
      hideRecordType
      periodStatsMode="simple"
    />
  );
}
