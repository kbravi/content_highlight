class ContentController < ApplicationController

  def add_content_highlights
    content_highlight = @content.content_highlights.new({
      :user => current_user,
      :entity_column => "summary",
      :content => params[:content],
      :container_node_identifier_key => params[:common_ancestor_identifier_key],
      :container_node_identifier => params[:common_ancestor_identifier],
      :container_node_type => params[:common_ancestor_node_type],
      :startnode_offset => params[:start_offset],
      :endnode_offset => params[:end_offset],
      :selection_backward => params[:backward]
    })
    content_highlight.save

    all_highlights = @content.content_highlights.joins(:user).map do |highlight|
      {
        "identifier" => highlight.id,
        "description" => "Highlighted by #{current_user.full_name}",
        "can_cancel" => (highlight.user_id == current_user.id or current_user.is_admin?),
        "life_time_class_ends" => ((highlight.user_id == current_user.id) ? "me" : "others"),
        "content" => highlight.content,
        "backward" => highlight.selection_backward,
        "start_offset" => highlight.startnode_offset,
        "end_offset" => highlight.endnode_offset,
        "common_ancestor_identifier" => highlight.container_node_identifier,
        "common_ancestor_node_type" => highlight.container_node_type
      }
    end
    render :json => all_highlights.as_json
  end

  def remove_content_highlights
    content_highlight = @content.content_highlights.where(:id => params[:content_highlight_id]).first
    if content_highlight.present? and content_highlight.user == current_user or current_user.is_admin?
      removable_highlights = @content.content_highlights.where(:id => content_highlight.id).joins(:user).map do |highlight|
        {
          "identifier" => highlight.id,
          "description" => "Highlighted by #{current_user.full_name}",
          "can_cancel" => (highlight.user_id == current_user.id or current_user.is_admin?),
          "life_time_class_ends" => ((highlight.user_id == current_user.id) ? "me" : "others"),
          "content" => highlight.content,
          "backward" => highlight.selection_backward,
          "start_offset" => highlight.startnode_offset,
          "end_offset" => highlight.endnode_offset,
          "common_ancestor_identifier" => highlight.container_node_identifier,
          "common_ancestor_node_type" =>  highlight.container_node_type
        }
      end
      content_highlight.destroy
    else
      removable_highlights = Array.new
    end
    render :json => removable_highlights.as_json
  end
end
