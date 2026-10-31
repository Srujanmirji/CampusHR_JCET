/* All records and writes in this review prototype are synthetic and memory-only. */
const hodScreens = [
 ['hod-home','HOD Home','HOD','Department decisions first, with a continuous academic context rail.'],
 ['hod-approvals','Approvals','HOD','One review action per request; decisions belong in context.'],
 ['hod-review','Leave Review','HOD','Applicant, history, balance and academic impact before the decision.'],
 ['hod-impact','Academic Impact','HOD','Two affected classes and their individual coverage states.'],
 ['hod-coverage','Smart Coverage','HOD','Availability and subject experience explain every recommendation.'],
 ['hod-confirm','Assignment Confirmation','HOD','Confirm faculty, class, time and room before committing.'],
 ['hod-success','Coverage Success','HOD','A server-confirmed assignment, notification receipt and remaining work.'],
 ['hod-workload','HOD Workload','HOD','Department hours with factual capacity alerts, without ranking people.'],
];
const platform = document.body.dataset.platform;
const originalScreens = [...screens];
screens.push(...hodScreens);
// Supporting destinations reuse frozen faculty views; the HOD menu exports only eight screens.
const adaptationIds = ['login','home','today','attendance','leave','apply','notifications','profile','hod-approvals','hod-review','hod-coverage','settings'];
const menuScreens = platform === 'hod' ? hodScreens : screens.filter(s => adaptationIds.includes(s[0]));
state.hodFilter='Pending';
state.candidate=0;
state.assigned=false;
state.secondClass=false;
state.recommendation=false;
state.decisionSheet=false;
state.coverageReady=true; // Separate approved-leave fixture; HOD recommendation never grants this state.
const candidates=[
 {name:'Prof. Priya Kulkarni',initials:'PK',role:'Assistant Professor · CSE',match:'94% match',hours:'15 / 18 hrs',reasons:['Excellent subject fit','Available','Previously taught DBMS'],available:true},
 {name:'Dr. Rahul Deshpande',initials:'RD',role:'Associate Professor · CSE',match:'Unavailable',hours:'18 / 18 hrs',reasons:['Unavailable','At workload capacity'],available:false},
 {name:'Prof. Sneha Patil',initials:'SP',role:'Assistant Professor · AI & ML',match:'74% match',hours:'13 / 18 hrs',reasons:['Available','Relevant experience'],available:true},
];
function hodTabs(active){
 return `<nav class="tabs" aria-label="HOD destinations">${[['hod-home','home','Home'],['hod-approvals','event_available','Approvals'],['today','calendar_month','Timetable'],['hod-workload','bar_chart','Workload'],['profile','account_circle','Profile']].map(([id,glyph,title])=>platform==='hod'&&['today','profile'].includes(id)?action('hod-outside',`${icon(glyph)}<span class="tab-label">${title}</span>`,'tab',`aria-label="${title}"`):link(id,`${icon(glyph)}<span class="tab-label">${title}</span>`,'tab',title).replace('class="tab"',`class="tab"${active===id?' aria-current="page"':''}`)).join('')}</nav>`;
}
function hShell(title,content,{back='',tab='',footer=''}={}){
 return `<section class="screen" aria-label="${title}">${bar(title,back)}<div class="screen-scroll">${content}</div>${footer}${tab?hodTabs(tab):''}</section>`;
}
function classContext(){return `<section class="class-context"><h2>${state.secondClass?'BCS508':'BCS501'}</h2><p>${state.secondClass?'Mini Project & Mentorship':'Database Management Systems'}</p><div class="context-line">${icon('schedule')}<span>${state.secondClass?'16:00–17:00':'11:15–12:15'} · Thu, 22 Oct</span></div><div class="context-line">${icon('location_on')}<span>CSE 5A${state.secondClass?'':' · Room 302'}</span></div><p class="secondary">Original faculty · Prof. Asha Patil</p></section>`;}
function impactRows(){return `<div class="schedule-list">${schedule([{...classes[1],section:'CSE 5A'},{...classes[2],section:'CSE 5A',room:''}],true).replaceAll(' · </div>','</div>')}</div>`;}
function hodHome(){return hShell('',`<div class="page-heading"><h1 class="greeting">Good morning,<br>Dr. Ramesh</h1><p>Professor & HOD · CSE</p><p class="secondary">Thursday, 22 October 2026</p></div><section class="decision-summary"><h2>Your department today</h2>${link('hod-approvals','<strong>3</strong><span>Pending approvals</span>'+icon('chevron_right'),'decision-row')}${link('hod-impact','<strong>2</strong><span>Classes need coverage</span>'+icon('chevron_right'),'decision-row')}</section><div class="department-summary"><div><strong>31 / 34</strong><span class="secondary">Faculty present</span></div>${link('hod-workload','<strong>2</strong><span class="secondary">Workload alerts</span>','workload-link')}</div><section class="continuity"><div class="section-heading"><h2>Academic continuity</h2><strong>94%</strong></div><progress value="94" max="100" aria-label="Academic continuity, 94 percent"></progress><p class="secondary">Department overview · 22 October</p></section><div class="section-heading"><h2>Needs your review</h2></div>${requestRow()}`,{tab:'hod-home',footer:''}).replace(bar(''),bar('', '',true));}
function requestRow(){return `<article class="request-row"><span class="avatar" aria-hidden="true">AP</span><div class="row-copy"><h3>Prof. Asha Patil</h3><p>Casual Leave</p><p class="secondary">22 Oct · 1 day</p><p class="caption">2 classes affected</p>${link('hod-review','Review','button secondary-button')}</div></article>`;}
function hodApprovals(){return hShell('Approvals',`<div class="page-heading"><h1>Approvals</h1><p class="secondary">3 requests need your attention</p></div><div class="segment" aria-label="Approval status">${['Pending','Approved','Rejected'].map(v=>action('hod-filter',v,'',`aria-pressed="${state.hodFilter===v}" data-filter="${v}"`)).join('')}</div>${state.hodFilter==='Pending'?requestRow():`<section class="empty-state">${icon(state.hodFilter==='Approved'?'check_circle':'history')}<h2>No ${state.hodFilter.toLowerCase()} requests</h2><p class="secondary">Requests will appear here after a decision is recorded.</p></section>`}`,{tab:'hod-approvals'});}
function decisionFooter(){return `<footer class="decision-footer">${action('hod-reject','Reject','text-button destructive')}${action('hod-approve','Approve & Find Cover','button')}<p class="caption">HOD recommendation · Final approval is still required.</p></footer>`;}
function hodReview(){return hShell('Leave Review',`<section class="applicant"><span class="avatar" aria-hidden="true">AP</span><div><h1>Prof. Asha Patil</h1><p class="secondary">JCET-CSE-021 · CSE</p></div></section><section class="detail-block">${status('Pending')}<h2>Casual Leave</h2><p>22 October 2026 · 1 day</p><p class="secondary">Reason</p><p>VTU syllabus revision meeting.</p></section><section class="detail-block"><h2>Leave balance</h2><div class="impact-row"><span>Casual Leave</span><strong>8.5 days remaining</strong></div><p class="secondary">Balance before this request</p></section><section class="detail-block"><h2>Previous leave history</h2><p>Duty Leave · 15 Oct · Approved</p><p class="secondary">1 day · Faculty development programme</p></section><section class="detail-block"><div class="section-heading"><h2>Academic Impact</h2></div><p class="secondary">2 classes affected</p>${impactRows()}${link('hod-impact','View academic impact','text-button')}</section>${state.recommendation?'<p class="status approved">Recommendation recorded · Awaiting final approval</p>':''}${state.decisionSheet?rejectionSheet():''}`,{back:'hod-approvals',footer:decisionFooter()});}
function hodImpact(){return hShell('Academic Impact',`<div class="page-heading"><h1>2 classes affected</h1><p class="secondary">Prof. Asha Patil · 22 October</p></div>${impactRows()}<section class="detail-block"><h2>Coverage</h2><p>${state.assigned?'1 of 2 classes covered':'No substitute assigned yet'}</p><p class="secondary">Assignments require final leave approval and a fresh availability check.</p>${action('hod-find','Find cover','button full')}</section>`,{back:'hod-review'});}
function hodCoverage(){return hShell('Smart Coverage',`${classContext()}<p class="caption approval-fixture">Approved leave · Coverage planning</p><div class="section-heading"><h2>Recommended faculty</h2></div><div class="recommendations">${candidates.map((c,i)=>`<article class="recommendation"><div class="candidate-heading"><span class="avatar" aria-hidden="true">${c.initials}</span><div><h3>${c.name}</h3><p class="secondary">${c.role}</p></div></div><p class="candidate-match ${c.available?'':'capacity'}">${c.match}</p><ul class="candidate-reasons">${c.reasons.map(r=>`<li>${icon(c.available?'check':'info',true)}${r}</li>`).join('')}<li>${icon('schedule',true)}${c.hours} workload</li></ul>${action('hod-assign','Assign','button secondary-button full',`data-candidate="${i}" ${!c.available?'disabled aria-disabled="true"':''}`)}</article>`).join('')}</div>`,{back:'hod-impact'});}
function hodConfirm(){const c=candidates[state.candidate];return hShell('Confirm Assignment',`<div class="page-heading"><h1>Assign this class?</h1><p class="secondary">Review the cover before confirming.</p></div><section class="detail-block"><h2>${c.name}</h2><p class="secondary">${c.role}</p><p>${c.hours} current workload</p></section>${classContext()}<section class="detail-block"><h2>After confirmation</h2><p>The covering faculty will be notified once the assignment is saved.</p><p class="secondary">Availability and workload will be checked again.</p></section>`,{back:'hod-coverage',footer:`<footer class="form-action">${action('hod-commit','Confirm assignment','button full')}${link('hod-coverage','Cancel','text-button full')}</footer>`});}
function hodSuccess(){const c=candidates[state.candidate];return hShell('Coverage',`<section class="coverage-success">${icon('check_circle')}<h1>Coverage confirmed</h1><p>${c.name} has been assigned.</p></section>${classContext()}<section class="detail-block"><div class="context-line success-text">${icon('check_circle')}<span>Notification sent</span></div><div class="section-heading"><h2>1 of 2 classes covered</h2></div><progress value="1" max="2" aria-label="1 of 2 classes covered"></progress></section>${action('hod-next','Continue to next class','button full')}${link('hod-impact','View academic impact','text-button full')}`,{back:'hod-impact'});}
function hodWorkload(){return hShell('Workload',`<div class="page-heading"><h1>Department workload</h1><p class="secondary">Computer Science & Engineering</p></div><section class="workload-summary"><strong>2 workload alerts</strong><p class="secondary">Review capacity before assigning cover.</p></section><section class="list-section">${[['Dr. Rahul Deshpande','18 / 18 hrs','At workload capacity'],['Prof. Meera Kulkarni','18 / 18 hrs','At workload capacity'],['Prof. Priya Kulkarni','15 / 18 hrs','Within capacity'],['Prof. Asha Patil','16 / 18 hrs','Within capacity']].map(([n,h,s])=>`<article class="workload-row"><h3>${n}</h3><div class="impact-row"><span>${h}</span><span class="${s.startsWith('At')?'capacity':'secondary'}">${s}</span></div></article>`).join('')}</section><p class="caption">Scheduled teaching hours · Current week</p>`,{tab:'hod-workload'});}
function rejectionSheet(){return `<div class="sheet-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="reject-title" class="sheet"><div class="sheet-handle"></div><h2 id="reject-title">Reject this request?</h2><p>Confirm your decision for Prof. Asha Patil’s Casual Leave.</p><label class="field">Reason<textarea id="rejection-reason" required minlength="3" rows="3"></textarea></label><p id="rejection-error" class="destructive" role="alert"></p>${action('hod-reject-confirm','Reject request','button destructive-button full')}${action('hod-reject-cancel','Keep reviewing','text-button full')}</section></div>`;}
const originalRender=render;
render=function(preserve=false,focusId=''){
 originalRender(preserve,focusId);
 document.body.dataset.platform=platform;
 $('#screen-list').innerHTML=menuScreens.map(([id,title])=>link(id,title,id===state.screen?'selected':'').replace('class="selected"','aria-current="page"')).join('');
 $('#preview-state').textContent=state.message||'Synthetic design data only. Approval, assignment and notification outcomes are simulated; no server is contacted.';
 if(state.screen.startsWith('hod-') && !['hod-home','hod-approvals','hod-workload'].includes(state.screen)) $('.preview-notes .preview-disclosure').textContent='Review and coverage are separate fixtures. HOD recommendation does not grant final approval.';
 if(state.decisionSheet && state.screen==='hod-review'){
  const screen=$('#app>.screen');
  const modal=$('[role=dialog]');
  for(const child of screen.children) if(!child.contains(modal))child.inert=true;
  const scroll=modal.closest('.screen-scroll'); if(scroll)for(const child of scroll.children) if(!child.contains(modal))child.inert=true;
  $('#rejection-reason').focus();
 }
};
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-action]'); if(!button)return;
 const name=button.dataset.action;
 if(name==='hod-filter'){state.hodFilter=button.dataset.filter;render();document.querySelector(`[data-filter="${state.hodFilter}"]`)?.focus();}
 if(name==='hod-outside')showNote('Destination is specified by frozen V2; its faculty design is unchanged and is outside this HOD eight-screen package.');
 if(name==='hod-approve'){state.recommendation=true;render();showNote('Preview: HOD recommendation recorded. Final approval is pending; coverage is not unlocked by this action.');}
 if(name==='hod-find'){state.secondClass=false;location.hash='hod-coverage';showNote('Separate approved-leave sample. This does not promote the pending HOD recommendation to final approval.');}
 if(name==='hod-assign' && candidates[Number(button.dataset.candidate)]?.available){state.candidate=Number(button.dataset.candidate);location.hash='hod-confirm';}
 if(name==='hod-commit'){state.assigned=true;location.hash='hod-success';}
 if(name==='hod-next'){state.secondClass=true;location.hash='hod-coverage';}
 if(name==='hod-reject'){state.decisionSheet=true;render();}
 if(name==='hod-reject-cancel'){state.decisionSheet=false;render();document.querySelector('[data-action="hod-reject"]')?.focus();}
 if(name==='hod-reject-confirm'){
  const input=$('#rejection-reason');
  if(input.value.trim().length<3){$('#rejection-error').textContent='Add a reason before rejecting.';input.focus();return;}
  state.decisionSheet=false;state.hodFilter='Rejected';location.hash='hod-approvals';showNote('Design preview only: rejection with reason. No request was changed.');
 }
});
document.addEventListener('keydown',event=>{
 if(!state.decisionSheet)return;
 const modal=$('[role=dialog]');if(!modal)return;
 if(event.key==='Escape'){event.preventDefault();state.decisionSheet=false;render();document.querySelector('[data-action="hod-reject"]')?.focus();}
 if(event.key==='Tab'){
  const nodes=[...modal.querySelectorAll('textarea,button,a')];const first=nodes[0],last=nodes.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
});
