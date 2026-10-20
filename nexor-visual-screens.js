/** Single source of truth for isolated, static Nexor Fit 2.0 preview navigation. */
export const nexorVisualScreens=Object.freeze([
 {id:'login',number:1,title:'Login',file:'visual-login-v2.html'},
 {id:'home',number:2,title:'Home',file:'visual-home-v2.html'},
 {id:'workouts',number:3,title:'Seleção de treinos',file:'visual-preview-v2.html'},
 {id:'session',number:4,title:'Treino em andamento',file:'visual-session-v2.html'},
 {id:'exercise',number:5,title:'Exercício',file:'visual-exercise-v2.html'},
 {id:'set-complete',number:6,title:'Série concluída',file:'visual-set-complete-v2.html'},
 {id:'rest',number:7,title:'Descanso',file:'visual-rest-v2.html'},
 {id:'exercise-complete',number:8,title:'Exercício concluído',file:'visual-exercise-complete-v2.html'},
 {id:'next-exercise',number:9,title:'Próximo exercício',file:'visual-next-exercise-v2.html'},
 {id:'history',number:10,title:'Histórico',file:'visual-history-v2.html'},
 {id:'evolution',number:11,title:'Evolução',file:'visual-evolution-v2.html'},
 {id:'profile',number:12,title:'Perfil e configurações',file:'visual-profile-v2.html'}
].map(screen=>Object.freeze(screen)));
export function getNexorVisualScreen(id){
 return nexorVisualScreens.find(screen=>screen.id===id)??null;
}
