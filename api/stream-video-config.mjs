// Members-only audio majlis on Stream Video. A dedicated call type keeps control of who can do what:
// the default audio_room type lets anonymous visitors join, which this one does not.
export const MAJLIS_CALL_TYPE='majlis'
export const MAJLIS_CALL={type:MAJLIS_CALL_TYPE,id:'kumeel-majlis'}

const listener=['read-call','join-call','create-call-reaction']
const host=['read-call','join-call','join-backstage','join-ended-call','create-call-reaction','send-audio','mute-users','update-call','update-call-permissions','update-call-member','block-user','remove-call-member','end-call']

export const majlisCallType={
 grants:{
  // Members listen, react and ask to speak; speaking needs a send-audio grant from the host.
  user:listener,
  call_member:listener,
  host,
  admin:host,
  anonymous:[],
 },
 settings:{
  audio:{default_device:'speaker',mic_default_on:false,speaker_default_on:true,access_request_enabled:true},
  video:{enabled:false,camera_default_on:false,access_request_enabled:false,target_resolution:{width:640,height:480}},
  screensharing:{enabled:false,access_request_enabled:false},
  backstage:{enabled:true},
  recording:{mode:'disabled'},
  transcription:{mode:'disabled'},
  // A forgotten open room ends on its own after three hours.
  limits:{max_duration_seconds:3*60*60},
 },
}
