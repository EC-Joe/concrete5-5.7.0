var CCMDashboard=function(){setupResultMessages=function(){if($("#ccm-dashboard-result-message").length>0){if($(".ccm-pane").length>0){var e=$(".ccm-pane").parent().attr("class"),t=$(".ccm-pane").parent().parent().attr("class"),n=$("#ccm-dashboard-result-message").html();$("#ccm-dashboard-result-message").html('<div class="'+t+'"><div class="'+e+'">'+n+"</div></div>").fadeIn(400)}}else $("#ccm-dashboard-result-message").fadeIn(200)};setupTooltips=function(){$(".launch-tooltip").tooltip({container:"#ccm-tooltip-holder"})};return{start:function(e){setupTooltips();setupResultMessages()}}}();