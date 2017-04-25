class HtmlCleaner
  def initialize(content)
    @content = content
    @parsed = Nokogiri::HTML.parse(@content)
  end

  attr_accessor :content, :parsed

  def assign_unique_node_identifiers(attribute_name)
    @running_unique_identifiers = Array.new
    apply_unique_identifiers_to_children(@parsed, attribute_name)
    return self
  end

  def body_content
    return @parsed.css('body').inner_html
  end

  private

  def apply_unique_identifiers_to_children(node, attribute_name)
    node.children.each do |node|
      if node[attribute_name].blank?
        unique_id = get_unique_key(@running_unique_identifiers)
        node[attribute_name] = unique_id
      end
      @running_unique_identifiers.push(node[attribute_name])
      node = apply_unique_identifiers_to_children(node, attribute_name)
    end
    return node
  end

  def get_unique_key(existing_array)
    unique_id = SecureRandom.hex(4)
    max_iter = 100
    iter = 0
    while(existing_array.include? unique_id and iter < max_iter)
      unique_id = SecureRandom.hex(4)
      iter += 1
    end
    return unique_id
  end
end
