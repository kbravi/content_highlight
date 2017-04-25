class Content < ActiveRecord::Base
  has_many :content_highlights, :dependent => :destroy
  before_save :name_html_nodes, :if => "summary_changed?"

  def name_html_nodes
    self.summary = HtmlCleaner.new(self.summary).assign_unique_node_identifiers('ms_node').body_content
  end
end
