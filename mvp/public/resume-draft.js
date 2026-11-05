const $=(s,r=document)=>r.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function mountResumeDraft({api,careerRow}){
 const section=document.createElement('section');section.className='resume-assist panel';
 section.setAttribute('aria-labelledby','resume-assist-title');
 section.innerHTML=`<div class="resume-assist-head"><span class="badge">이력서로 간편하게</span><h2 id="resume-assist-title">이미 쌓은 경험으로,<br>소개 작성을 시작하세요.</h2><p>PDF 이력서를 올리면 전문 분야·경력 소개·상담 주제의 초안을 만들어드립니다.</p></div><ol class="resume-steps"><li>이력서 업로드</li><li>소개 초안 확인·수정</li><li>검토 신청</li></ol><form id="draft-form"><label class="field"><span>이력서 PDF · 최대 3MB</span><input name="draftResume" type="file" accept="application/pdf,.pdf" required aria-describedby="draft-file-help"></label><p class="label" id="draft-file-help">주민등록번호·주소·서명·제3자 연락처는 제외해주세요. 분석용 파일은 울림에 별도 저장되지 않습니다. 보관이 필요하면 아래 비공개 첨부를 이용하세요.</p><label class="check"><input name="aiConsent" type="checkbox" required><span>소개 초안 작성을 위해 이력서 파일을 OpenAI에 전송하는 <a href="/privacy#resume-ai" target="_blank" rel="noopener">AI 분석 안내</a>를 확인하고 동의합니다. 선택 사항이며 직접 작성할 수도 있습니다.</span></label><div class="actions"><button class="primary" type="submit" disabled>이력서로 소개 만들기</button><a class="btn" href="#profile-form">직접 작성하기</a></div><p class="status" role="status">자동 작성 기능을 확인하고 있습니다.</p></form><div id="draft-preview" class="draft-preview" hidden tabindex="-1"></div>`;
 $('#profile-state').before(section);
 const form=$('#draft-form',section),button=$('button',form),status=$('.status',form),preview=$('#draft-preview',section);
 let config;try{config=await api('/api/expert-profile/draft');button.disabled=!config.available;status.textContent=config.available?'상담료와 가능 시간은 직접 정할 수 있습니다.':'자동 소개 작성 준비 중입니다. 아래에서 직접 작성하거나 이력서를 비공개로 첨부해주세요.';}catch{status.textContent='자동 작성 기능을 확인하지 못했습니다. 직접 작성은 계속할 수 있습니다.';}
 form.onsubmit=async event=>{
  event.preventDefault();if(!config?.available||button.disabled)return;
  const file=$('[name=draftResume]',form).files[0];
  if(!file||!file.size||file.size>3*1024*1024||!file.name.toLowerCase().endsWith('.pdf')){status.textContent='3MB 이내 PDF를 선택해주세요.';return;}
  button.disabled=true;form.setAttribute('aria-busy','true');status.textContent='이력서를 읽고 소개 초안을 만들고 있습니다. 잠시 기다려주세요.';preview.hidden=true;
  try{
   const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('파일을 읽지 못했습니다. 다시 선택해주세요.'));reader.readAsDataURL(file)});
   const {draft}=await api('/api/expert-profile/draft',{method:'POST',timeout:75000,data:{base64,aiConsent:$('[name=aiConsent]',form).checked,consentVersion:config.consentVersion}});
   const bullets=items=>items.length?`<ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="muted">직접 입력이 필요합니다.</p>';
   preview.innerHTML=`<span class="badge">확인이 필요한 AI 초안</span><h3>${esc(draft.headline||'전문 분야를 직접 입력해주세요.')}</h3><p class="preserve">${esc(draft.bio)}</p><p><strong>산업</strong> ${esc(draft.industries.join(' · ')||'확인 필요')}<br><strong>직무</strong> ${esc(draft.jobs.join(' · ')||'확인 필요')}<br><strong>총 경력</strong> ${draft.years===null?'직접 확인 필요':esc(draft.years)+'년'}</p><h3>제안된 상담 주제</h3>${bullets(draft.topics)}<h3>주요 경력</h3>${draft.careers.map(c=>`<article class="note"><strong>${esc(c.role)}</strong><p>${esc(c.industry)} · ${esc(c.years)}${c.company?'<br>비공개 소속: '+esc(c.company):''}</p><p class="preserve">${esc(c.work)}</p></article>`).join('')||'<p>경력을 직접 입력해주세요.</p>'}${draft.reviewNotes.length?'<h3>직접 확인할 내용</h3>'+bullets(draft.reviewNotes):''}<p class="label">AI가 잘못 읽거나 부정확하게 정리할 수 있습니다. 실제 수행한 업무와 상담 가능한 주제를 확인해주세요. 적용 후에도 자유롭게 수정할 수 있으며, 자동 제출·공개되지 않습니다.</p><button class="primary" type="button" id="apply-draft">초안을 입력란에 적용</button><p class="status" role="status"></p>`;
   preview.hidden=false;preview.focus();status.textContent='초안이 준비되었습니다. 내용을 확인한 뒤 입력란에 적용해주세요.';
   $('#apply-draft',preview).onclick=()=>{
    const target=$('#profile-form');
    const hasContent=['headline','bio','industries','jobs','topics'].some(k=>$(`[name=${k}]`,target).value.trim())||[...target.querySelectorAll('.career-row input,.career-row textarea')].some(x=>x.value.trim());
    if(hasContent&&!confirm('현재 입력한 소개와 경력을 이 초안으로 바꿀까요? 표시 이름·상담료·시간·방식은 유지되고, 소속 공개와 참여 확인은 다시 선택합니다.'))return;
    for(const k of ['headline','bio'])$(`[name=${k}]`,target).value=draft[k];
    for(const k of ['industries','jobs'])$(`[name=${k}]`,target).value=draft[k].join(', ');
    $('[name=topics]',target).value=draft.topics.join('\n');$('[name=years]',target).value=draft.years??'';
    const careers=$('#careers');careers.replaceChildren();(draft.careers.length?draft.careers:[{}]).forEach(c=>careers.append(careerRow(c)));
    $('[name=showCompanies]',target).checked=false;$('[name=participationConsent]',target).checked=false;
    $('.status',target).textContent='이력서 초안을 적용했습니다. 경력·상담 주제를 확인하고, 상담 조건을 입력한 뒤 검토 신청해주세요. 아직 저장·제출되지 않았습니다.';
    $('#apply-draft',preview).disabled=true;$('.status',preview).textContent='입력란에 적용했습니다. 아래에서 수정하고 검토 신청해주세요.';
    $('[name=headline]',target).focus();
   };
  }catch(e){status.textContent=e.name==='TimeoutError'?'분석 시간이 길어지고 있습니다. 잠시 후 다시 시도해주세요.':e.message;}
  finally{button.disabled=false;form.removeAttribute('aria-busy');}
 };
}
